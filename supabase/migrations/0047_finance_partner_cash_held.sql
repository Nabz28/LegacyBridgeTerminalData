-- 0047: split partner "loans" into real-payable vs partner-cash-held-in-Jago.
do $$
declare lbc uuid; p2000 uuid;
begin
  select id into lbc from finance.entities where code='LBC';
  select id into p2000 from finance.accounts where entity_id=lbc and code='2000';
  if not exists (select 1 from finance.accounts where entity_id=lbc and code='2230') then
    insert into finance.accounts (entity_id,code,name,type,parent_id) values (lbc,'2230','Partner Cash Held — Nabil','liability',p2000); end if;
  if not exists (select 1 from finance.accounts where entity_id=lbc and code='2240') then
    insert into finance.accounts (entity_id,code,name,type,parent_id) values (lbc,'2240','Partner Cash Held — Rattana','liability',p2000); end if;
  update finance.accounts set name='Payable — Nabil (advances/opex)' where entity_id=lbc and code='2210';
  update finance.accounts set name='Payable — Rattana' where entity_id=lbc and code='2220';
end $$;
