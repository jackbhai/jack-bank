-- ============ JACK BANK SEED ============
-- 1) profiles
update public.jb_profiles set name='Aarav Sharma', phone='9876543210', balance=124500, kyc_status='approved', avatar_hue=258, rewards=120, ifsc='JACK0012345', branch='Jack Bank, Saket, New Delhi', account_type='Savings' where email='aarav@jackbank.app';
update public.jb_profiles set name='Priya Verma', phone='9812345678', balance=83200, kyc_status='approved', avatar_hue=325, rewards=185, ifsc='JACK0023456', branch='Jack Bank, Saket, New Delhi', account_type='Savings' where email='priya@jackbank.app';
update public.jb_profiles set name='Rohan Mehta', phone='9898989898', balance=45200, kyc_status='approved', avatar_hue=200, rewards=250, ifsc='JACK0034567', branch='Jack Bank, Saket, New Delhi', account_type='Current' where email='rohan@jackbank.app';
update public.jb_profiles set name='Sneha Iyer', phone='9765432109', balance=96000, kyc_status='approved', avatar_hue=155, rewards=315, ifsc='JACK0045678', branch='Jack Bank, Saket, New Delhi', account_type='Savings' where email='sneha@jackbank.app';
update public.jb_profiles set name='Kabir Khan', phone='9999999999', balance=17800, kyc_status='pending', avatar_hue=30, rewards=90, ifsc='JACK0056789', branch='Jack Bank, Saket, New Delhi', account_type='Savings' where email='kabir@jackbank.app';
update public.jb_profiles set name='Jack Owner', phone='9000000000', kyc_status='approved', avatar_hue=270, ifsc='JACK0000001', branch='Jack Bank HQ, Saket, New Delhi', role='admin' where email='admin@jackbank.app';

-- 2) cards
insert into public.jb_cards (user_id, type, number, holder_name, expiry, cvv, network, status, credit_limit, due_amount, due_date) values
('e85624ed-58ca-4ebd-9a31-10aa0577c4ca','debit','4539 8210 3746 1829','AARAV SHARMA','09/27','347','Visa','active',null,null,null),
('e85624ed-58ca-4ebd-9a31-10aa0577c4ca','credit','5408 1122 3344 5566','AARAV SHARMA','11/28','892','Mastercard','active',50000,5000,(now()+interval '8 days')::date),
('da3c9f57-2f80-483a-a51a-1a9b07f49ab5','debit','4539 7712 9018 3345','PRIYA VERMA','03/28','415','Mastercard','active',null,null,null),
('da3c9f57-2f80-483a-a51a-1a9b07f49ab5','credit','5408 2233 4455 6677','PRIYA VERMA','07/29','631','RuPay','active',50000,6000,(now()+interval '10 days')::date),
('0c9296e9-43f6-4578-bf24-9cf1132a04bf','debit','4539 6654 8821 9087','ROHAN MEHTA','12/27','728','RuPay','active',null,null,null),
('0c9296e9-43f6-4578-bf24-9cf1132a04bf','credit','5408 3344 5566 7788','ROHAN MEHTA','02/29','503','Visa','active',50000,0,(now()+interval '12 days')::date),
('2c737157-ed12-4a6b-ae13-fb4666952d90','debit','4539 9081 2345 6678','SNEHA IYER','06/28','916','Visa','active',null,null,null),
('2c737157-ed12-4a6b-ae13-fb4666952d90','credit','5408 4455 6677 8899','SNEHA IYER','10/29','240','Mastercard','active',50000,0,(now()+interval '14 days')::date),
('5b93e484-b7dc-4315-908b-c1b0094ce20a','debit','4539 1122 7766 5544','KABIR KHAN','08/27','574','Mastercard','active',null,null,null),
('5b93e484-b7dc-4315-908b-c1b0094ce20a','credit','5408 5566 7788 9900','KABIR KHAN','01/29','813','RuPay','active',50000,0,(now()+interval '16 days')::date);

-- 3) FDs
insert into public.jb_fds (user_id, amount, months, rate, maturity_at, maturity_value) values
('da3c9f57-2f80-483a-a51a-1a9b07f49ab5',50000,12,7, now()+interval '265 days', 53500),
('2c737157-ed12-4a6b-ae13-fb4666952d90',100000,24,7, now()+interval '680 days', 114000);

-- 4) loans
insert into public.jb_loans (user_id, amount, months, rate, emi, status, disbursed_at, emis_paid, total_payable) values
('da3c9f57-2f80-483a-a51a-1a9b07f49ab5',25000,12,12,2221,'active', now()-interval '119 days', 4, 26652),
('2c737157-ed12-4a6b-ae13-fb4666952d90',100000,24,12,4707,'active', now()-interval '199 days', 7, 112968);

-- 5) transactions
insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status, created_at) values
(jb_gen_ref_no(),'deposit',50000,null,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Initial deposit','admin','success', now()-interval '35 days'),
(jb_gen_ref_no(),'deposit',40000,null,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','Initial deposit','admin','success', now()-interval '33 days'),
(jb_gen_ref_no(),'deposit',30000,null,'0c9296e9-43f6-4578-bf24-9cf1132a04bf','Initial deposit','admin','success', now()-interval '31 days'),
(jb_gen_ref_no(),'deposit',45000,null,'2c737157-ed12-4a6b-ae13-fb4666952d90','Initial deposit','admin','success', now()-interval '30 days'),
(jb_gen_ref_no(),'deposit',15000,null,'5b93e484-b7dc-4315-908b-c1b0094ce20a','Initial deposit','admin','success', now()-interval '28 days'),
(jb_gen_ref_no(),'welcome',500,null,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Welcome bonus','account','success', now()-interval '34 days'),
(jb_gen_ref_no(),'welcome',500,null,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','Welcome bonus','account','success', now()-interval '33 days'),
(jb_gen_ref_no(),'welcome',500,null,'0c9296e9-43f6-4578-bf24-9cf1132a04bf','Welcome bonus','account','success', now()-interval '31 days'),
(jb_gen_ref_no(),'welcome',500,null,'2c737157-ed12-4a6b-ae13-fb4666952d90','Welcome bonus','account','success', now()-interval '30 days'),
(jb_gen_ref_no(),'welcome',500,null,'5b93e484-b7dc-4315-908b-c1b0094ce20a','Welcome bonus','account','success', now()-interval '28 days'),
(jb_gen_ref_no(),'loan_disbursal',25000,null,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','Personal loan disbursed','admin','success', now()-interval '119 days'),
(jb_gen_ref_no(),'loan_disbursal',100000,null,'2c737157-ed12-4a6b-ae13-fb4666952d90','Personal loan disbursed','admin','success', now()-interval '199 days'),
(jb_gen_ref_no(),'transfer',2500,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','da3c9f57-2f80-483a-a51a-1a9b07f49ab5','Movie tickets','upi','success', now()-interval '20 days'),
(jb_gen_ref_no(),'transfer',1200,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Dinner split','upi','success', now()-interval '19 days'),
(jb_gen_ref_no(),'transfer',4000,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','0c9296e9-43f6-4578-bf24-9cf1132a04bf','Trip booking','upi','success', now()-interval '17 days'),
(jb_gen_ref_no(),'transfer',1500,'0c9296e9-43f6-4578-bf24-9cf1132a04bf','2c737157-ed12-4a6b-ae13-fb4666952d90','Gift contribution','upi','success', now()-interval '15 days'),
(jb_gen_ref_no(),'transfer',6000,'2c737157-ed12-4a6b-ae13-fb4666952d90','e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Rent share','upi','success', now()-interval '12 days'),
(jb_gen_ref_no(),'transfer',800,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','5b93e484-b7dc-4315-908b-c1b0094ce20a','Chai and snacks','upi','success', now()-interval '10 days'),
(jb_gen_ref_no(),'transfer',1000,'5b93e484-b7dc-4315-908b-c1b0094ce20a','da3c9f57-2f80-483a-a51a-1a9b07f49ab5','Recharge','upi','success', now()-interval '9 days'),
(jb_gen_ref_no(),'transfer',3500,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','2c737157-ed12-4a6b-ae13-fb4666952d90','Concert tickets','upi','success', now()-interval '6 days'),
(jb_gen_ref_no(),'transfer',2200,'0c9296e9-43f6-4578-bf24-9cf1132a04bf','e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Fuel share','upi','success', now()-interval '4 days'),
(jb_gen_ref_no(),'transfer',900,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5','0c9296e9-43f6-4578-bf24-9cf1132a04bf','Cake','upi','success', now()-interval '3 days'),
(jb_gen_ref_no(),'emi',2221,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5',null,'Loan EMI','account','success', now()-interval '100 days'),
(jb_gen_ref_no(),'emi',2221,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5',null,'Loan EMI','account','success', now()-interval '70 days'),
(jb_gen_ref_no(),'emi',2221,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5',null,'Loan EMI','account','success', now()-interval '40 days'),
(jb_gen_ref_no(),'emi',2221,'da3c9f57-2f80-483a-a51a-1a9b07f49ab5',null,'Loan EMI','account','success', now()-interval '10 days'),
(jb_gen_ref_no(),'emi',4707,'2c737157-ed12-4a6b-ae13-fb4666952d90',null,'Loan EMI','account','success', now()-interval '170 days'),
(jb_gen_ref_no(),'emi',4707,'2c737157-ed12-4a6b-ae13-fb4666952d90',null,'Loan EMI','account','success', now()-interval '140 days'),
(jb_gen_ref_no(),'emi',4707,'2c737157-ed12-4a6b-ae13-fb4666952d90',null,'Loan EMI','account','success', now()-interval '110 days'),
(jb_gen_ref_no(),'card_spend',12999,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca',null,'Headphones','card','success', now()-interval '8 days'),
(jb_gen_ref_no(),'card_payment',12999,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca',null,'Credit card bill','account','success', now()-interval '7 days'),
(jb_gen_ref_no(),'card_spend',8499,'2c737157-ed12-4a6b-ae13-fb4666952d90',null,'Shoes','card','success', now()-interval '5 days'),
(jb_gen_ref_no(),'withdrawal',3000,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca',null,'ATM withdrawal','account','success', now()-interval '2 days'),
(jb_gen_ref_no(),'interest',34,null,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Savings interest','account','success', now()-interval '1 days'),
(jb_gen_ref_no(),'cashback',45,null,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Cashback on transfers','account','success', now()-interval '1 days'),
(jb_gen_ref_no(),'fee',8,'e85624ed-58ca-4ebd-9a31-10aa0577c4ca',null,'Transaction fee','account','success', now()-interval '1 days');

-- 6) pending requests
insert into public.jb_requests (kind, user_id, amount, meta, note) values
('deposit','5b93e484-b7dc-4315-908b-c1b0094ce20a',10000,'{}','Add money via UPI'),
('withdrawal','0c9296e9-43f6-4578-bf24-9cf1132a04bf',5000,'{}','Withdraw to bank'),
('loan','e85624ed-58ca-4ebd-9a31-10aa0577c4ca',60000,'{"months":12,"purpose":"New laptop"}',null),
('kyc','5b93e484-b7dc-4315-908b-c1b0094ce20a',null,'{}',null),
('card','da3c9f57-2f80-483a-a51a-1a9b07f49ab5',null,'{"cardType":"credit","requestedLimit":75000}',null);

-- 7) money requests
insert into public.jb_money_requests (from_user, to_user, amount, note) values
('da3c9f57-2f80-483a-a51a-1a9b07f49ab5','e85624ed-58ca-4ebd-9a31-10aa0577c4ca',1500,'Trip contribution');

-- 8) notifications
insert into public.jb_notifications (user_id, title, body) values
('e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Money received','You received 3500 from Sneha Iyer'),
('e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Cashback credited','45 cashback added to your account'),
('e85624ed-58ca-4ebd-9a31-10aa0577c4ca','Loan offer','You are eligible for a personal loan up to 100000');

-- 9) announcements
insert into public.jb_announcements (text) values
('Welcome to Jack Bank — your friends-only virtual bank. Add money, trade with friends, and manage your cards!');
