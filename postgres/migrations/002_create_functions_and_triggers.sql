begin;

set local role skazkids_owner;

alter table public.children
  add constraint children_age_check
  check (age between 3 and 7) not valid;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_children_limit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if (
    select count(*)
    from public.children
    where user_id = new.user_id
  ) >= 5 then
    raise exception 'CHILDREN_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_story_series_membership()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.series_id is null or new.episode_number is null then
    raise exception 'SERIES_REQUIRED';
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger story_series_set_updated_at
  before update on public.story_series
  for each row execute function public.set_updated_at();

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

create trigger children_enforce_limit
  before insert on public.children
  for each row execute function public.enforce_children_limit();

create trigger stories_require_series
  before insert on public.stories
  for each row execute function public.enforce_story_series_membership();

create or replace function public.expire_stale_story_generations(
  target_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expired_count integer;
begin
  with expired_stories as (
    update public.stories
    set
      status = 'failed',
      error_message = 'Создание серии прервалось. Нажмите «Повторить».',
      generation_started_at = null
    where user_id = target_user_id
      and status in ('pending', 'generating')
      and coalesce(generation_started_at, created_at) < now() - interval '10 minutes'
    returning series_id
  ), updated_series as (
    update public.story_series
    set
      status = 'failed',
      last_error = 'Создание серии прервалось. Нажмите «Повторить».',
      generation_started_at = null
    where user_id = target_user_id
      and id in (select series_id from expired_stories)
    returning id
  )
  select count(*) into expired_count
  from expired_stories;

  return expired_count;
end;
$$;

create or replace function public.create_series_with_first_episode(
  target_user_id uuid,
  target_child_id uuid,
  series_title text,
  series_premise text,
  episode_count integer,
  target_creation_key uuid,
  target_generation_key uuid,
  target_generation_input jsonb,
  use_starter_offer boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_series_id uuid;
  created_story_id uuid;
  selected_model text := 'gpt-5.6-terra';
  offer_order public.starter_offer_orders%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  select id into created_series_id
  from public.story_series
  where user_id = target_user_id and creation_key = target_creation_key;

  if created_series_id is not null then
    select id into created_story_id
    from public.stories
    where series_id = created_series_id and episode_number = 1;

    return jsonb_build_object(
      'series_id', created_series_id,
      'story_id', created_story_id
    );
  end if;

  if not exists (
    select 1
    from public.children
    where id = target_child_id and user_id = target_user_id
  ) then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if episode_count <> 3 and (episode_count < 8 or episode_count > 16) then
    raise exception 'INVALID_EPISODE_COUNT';
  end if;

  perform public.expire_stale_story_generations(target_user_id);

  if exists (
    select 1
    from public.stories
    where user_id = target_user_id and status in ('pending', 'generating')
  ) then
    raise exception 'GENERATION_ALREADY_RUNNING';
  end if;

  if use_starter_offer then
    if episode_count <> 3 then
      raise exception 'STARTER_OFFER_REQUIRES_THREE_EPISODES';
    end if;

    select * into offer_order
    from public.starter_offer_orders
    where user_id = target_user_id
    for update;

    if offer_order.user_id is null
      or offer_order.status <> 'paid'
      or offer_order.series_id is not null then
      raise exception 'STARTER_OFFER_NOT_AVAILABLE';
    end if;
  elsif episode_count = 3 then
    raise exception 'STARTER_OFFER_REQUIRED';
  else
    select plan.model_code into selected_model
    from public.subscriptions subscription
    join public.subscription_plans plan on plan.id = subscription.plan_id
    where subscription.user_id = target_user_id
      and subscription.status = 'active'
      and plan.is_active = true
    order by subscription.created_at desc
    limit 1;

    selected_model := coalesce(selected_model, 'gpt-5.6-terra');
  end if;

  insert into public.story_series (
    user_id,
    child_id,
    title,
    premise,
    planned_episodes,
    status,
    model_code,
    creation_key
  )
  values (
    target_user_id,
    target_child_id,
    series_title,
    series_premise,
    episode_count,
    'pending',
    selected_model,
    target_creation_key
  )
  returning id into created_series_id;

  insert into public.stories (
    user_id,
    child_id,
    series_id,
    episode_number,
    theme,
    status,
    generation_key,
    generation_input
  )
  values (
    target_user_id,
    target_child_id,
    created_series_id,
    1,
    'Серия 1',
    'pending',
    target_generation_key,
    coalesce(target_generation_input, '{}'::jsonb)
  )
  returning id into created_story_id;

  if use_starter_offer then
    update public.starter_offer_orders
    set
      status = 'used',
      series_id = created_series_id,
      consumed_at = now()
    where user_id = target_user_id;
  end if;

  return jsonb_build_object(
    'series_id', created_series_id,
    'story_id', created_story_id
  );
end;
$$;

create or replace function public.reserve_series_episode(
  target_user_id uuid,
  target_series_id uuid,
  target_generation_key uuid,
  target_generation_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  series_record public.story_series%rowtype;
  existing_story_id uuid;
  next_episode integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  select id into existing_story_id
  from public.stories
  where user_id = target_user_id and generation_key = target_generation_key;

  if existing_story_id is not null then
    return existing_story_id;
  end if;

  select * into series_record
  from public.story_series
  where id = target_series_id and user_id = target_user_id
  for update;

  if series_record.id is null then
    raise exception 'SERIES_NOT_FOUND';
  end if;

  if series_record.status = 'completed' then
    raise exception 'SERIES_COMPLETED';
  end if;

  perform public.expire_stale_story_generations(target_user_id);

  if exists (
    select 1
    from public.stories
    where user_id = target_user_id and status in ('pending', 'generating')
  ) then
    raise exception 'GENERATION_ALREADY_RUNNING';
  end if;

  if exists (
    select 1
    from public.stories
    where series_id = target_series_id and status = 'failed'
  ) then
    raise exception 'FAILED_EPISODE_REQUIRES_RETRY';
  end if;

  select coalesce(max(episode_number), 0) + 1 into next_episode
  from public.stories
  where series_id = target_series_id;

  if next_episode > series_record.planned_episodes then
    raise exception 'SERIES_COMPLETED';
  end if;

  insert into public.stories (
    user_id,
    child_id,
    series_id,
    episode_number,
    theme,
    status,
    generation_key,
    generation_input
  )
  values (
    target_user_id,
    series_record.child_id,
    target_series_id,
    next_episode,
    'Серия ' || next_episode,
    'pending',
    target_generation_key,
    coalesce(target_generation_input, '{}'::jsonb)
  )
  returning id into existing_story_id;

  update public.story_series
  set status = 'pending', last_error = null
  where id = target_series_id;

  return existing_story_id;
end;
$$;

create or replace function public.claim_story_generation(
  target_user_id uuid,
  target_story_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed_series_id uuid;
begin
  update public.stories
  set
    status = 'generating',
    generation_started_at = now(),
    error_message = null
  where id = target_story_id
    and user_id = target_user_id
    and (
      status in ('pending', 'failed')
      or (
        status = 'generating'
        and generation_started_at < now() - interval '10 minutes'
      )
    )
  returning series_id into claimed_series_id;

  if claimed_series_id is null then
    return false;
  end if;

  update public.story_series
  set
    status = 'generating',
    generation_started_at = now(),
    last_error = null
  where id = claimed_series_id;

  return true;
end;
$$;

create or replace function public.complete_story_generation(
  target_user_id uuid,
  target_story_id uuid,
  generated_title text,
  generated_text text,
  generated_summary text,
  generated_provider text,
  updated_memory jsonb,
  updated_aliases jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  story_record public.stories%rowtype;
  series_record public.story_series%rowtype;
  completed_count integer;
begin
  select * into story_record
  from public.stories
  where id = target_story_id and user_id = target_user_id
  for update;

  if story_record.id is null then
    raise exception 'STORY_NOT_FOUND';
  end if;

  if story_record.status = 'completed' then
    return story_record.series_id;
  end if;

  if story_record.status <> 'generating' then
    raise exception 'STORY_NOT_CLAIMED';
  end if;

  select * into series_record
  from public.story_series
  where id = story_record.series_id and user_id = target_user_id
  for update;

  update public.stories
  set
    title = generated_title,
    text_content = generated_text,
    summary = generated_summary,
    provider_llm = generated_provider,
    status = 'completed',
    error_message = null,
    generation_started_at = null
  where id = story_record.id;

  select count(*) into completed_count
  from public.stories
  where series_id = story_record.series_id and status = 'completed';

  update public.story_series
  set
    series_memory = coalesce(updated_memory, series_memory),
    private_aliases = coalesce(updated_aliases, private_aliases),
    status = case
      when completed_count >= series_record.planned_episodes then 'completed'
      else 'active'
    end,
    last_error = null,
    generation_started_at = null
  where id = story_record.series_id;

  insert into public.usage_events (user_id, story_id, event_type, amount)
  values (target_user_id, story_record.id, 'series_episode_created', 1)
  on conflict (story_id, event_type)
    where story_id is not null and event_type = 'series_episode_created'
  do nothing;

  return story_record.series_id;
end;
$$;

create or replace function public.fail_story_generation(
  target_user_id uuid,
  target_story_id uuid,
  failure_message text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  failed_series_id uuid;
begin
  update public.stories
  set
    status = 'failed',
    error_message = left(failure_message, 500),
    generation_started_at = null
  where id = target_story_id
    and user_id = target_user_id
    and status in ('pending', 'generating')
  returning series_id into failed_series_id;

  if failed_series_id is not null then
    update public.story_series
    set
      status = 'failed',
      last_error = left(failure_message, 500),
      generation_started_at = null
    where id = failed_series_id;
  end if;

  return failed_series_id;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.enforce_children_limit() from public;
revoke all on function public.enforce_story_series_membership() from public;
revoke all on function public.expire_stale_story_generations(uuid) from public;
revoke all on function public.create_series_with_first_episode(
  uuid, uuid, text, text, integer, uuid, uuid, jsonb, boolean
) from public;
revoke all on function public.reserve_series_episode(
  uuid, uuid, uuid, jsonb
) from public;
revoke all on function public.claim_story_generation(uuid, uuid) from public;
revoke all on function public.complete_story_generation(
  uuid, uuid, text, text, text, text, jsonb, jsonb
) from public;
revoke all on function public.fail_story_generation(uuid, uuid, text) from public;

grant execute on function public.create_series_with_first_episode(
  uuid, uuid, text, text, integer, uuid, uuid, jsonb, boolean
) to skazkids_app;
grant execute on function public.reserve_series_episode(
  uuid, uuid, uuid, jsonb
) to skazkids_app;
grant execute on function public.claim_story_generation(uuid, uuid)
  to skazkids_app;
grant execute on function public.complete_story_generation(
  uuid, uuid, text, text, text, text, jsonb, jsonb
) to skazkids_app;
grant execute on function public.fail_story_generation(uuid, uuid, text)
  to skazkids_app;

commit;
