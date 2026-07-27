-- Default currency for new teachers is PKR (standard rate: 450 PKR/hr).
alter table teachers alter column currency set default 'PKR';
