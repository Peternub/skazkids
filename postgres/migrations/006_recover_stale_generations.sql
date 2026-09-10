begin;

set local role skazkids_owner;

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

revoke all on function public.expire_stale_story_generations(uuid) from public;

do $$
declare
  stale_user record;
  expired_total integer := 0;
begin
  for stale_user in
    select distinct user_id
    from public.stories
    where status in ('pending', 'generating')
      and coalesce(generation_started_at, created_at) < now() - interval '10 minutes'
  loop
    expired_total := expired_total
      + public.expire_stale_story_generations(stale_user.user_id);
  end loop;

  raise notice 'Снято зависших блокировок генерации: %', expired_total;
end;
$$;

commit;

