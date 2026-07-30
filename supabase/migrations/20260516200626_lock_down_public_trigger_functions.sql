revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end;
$$;
