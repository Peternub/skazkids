\set ON_ERROR_STOP on

-- Запуск: psql --dbname=skazkids --set=account_email='АДРЕС' --file=postgres/grant-unlimited-access.sql
-- Повторный запуск не создаёт вторую подписку. Платежи и существующие тарифы не изменяются.
begin;

select set_config('skazkids.grant_email', lower(trim(:'account_email')), true);

do $$
declare
  target_account public."user"%rowtype;
  access_plan_id uuid;
  access_subscription_id uuid;
begin
  select * into strict target_account
  from public."user"
  where lower(email) = current_setting('skazkids.grant_email');

  perform pg_advisory_xact_lock(hashtextextended(target_account.id::text, 0));

  insert into public.profiles (id, email)
  values (target_account.id, target_account.email)
  on conflict (id) do nothing;

  insert into public.subscription_plans (
    code, name, description, price_rub, stories_limit,
    is_active, billing_period, is_unlimited, model_code
  ) values (
    'personal-unlimited-' || target_account.id::text,
    'Персональный безлимит',
    'Бессрочный доступ к созданию сериалов и серий без оплаты и автосписаний.',
    0, 0, true, 'once', true, 'gpt-5.6-terra'
  ) on conflict (code) do update set
    is_active = true,
    is_unlimited = true,
    stories_limit = 0,
    price_rub = 0
  returning id into access_plan_id;

  select id into access_subscription_id
  from public.subscriptions
  where user_id = target_account.id and plan_id = access_plan_id
  order by created_at desc
  limit 1;

  if access_subscription_id is null then
    insert into public.subscriptions (
      user_id, plan_id, status, started_at, current_period_end
    ) values (
      target_account.id, access_plan_id, 'active', now(), null
    ) returning id into access_subscription_id;
  else
    update public.subscriptions
    set status = 'active', current_period_end = null, canceled_at = null
    where id = access_subscription_id;
  end if;

  update public.profiles
  set subscription_status = 'active'
  where id = target_account.id;

  if not exists (
    select 1
    from public.subscriptions subscription
    join public.subscription_plans plan on plan.id = subscription.plan_id
    where subscription.id = access_subscription_id
      and subscription.user_id = target_account.id
      and subscription.status = 'active'
      and subscription.current_period_end is null
      and plan.is_active and plan.is_unlimited
  ) then
    raise exception 'Не удалось подтвердить безлимитный доступ';
  end if;

  raise notice 'Безлимитный доступ выдан. Подписка: %', access_subscription_id;
exception
  when no_data_found then
    raise exception 'Аккаунт с указанным email не найден';
  when too_many_rows then
    raise exception 'Найдено несколько аккаунтов: требуется уточнение';
end;
$$;

commit;
