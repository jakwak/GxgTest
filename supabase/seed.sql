-- seed.sql — 6가지 유형 샘플 + 데모 세션(room_code = 'DEMO01')
-- supabase db reset 시 자동 적용된다.

-- 고정 UUID (참조용)
-- matching        : 11111111-...-0001
-- multiple_choice : 11111111-...-0002
-- classify        : 11111111-...-0003
-- ordering        : 11111111-...-0004
-- hotspot         : 11111111-...-0005
-- slider          : 11111111-...-0006

insert into gxgtest_questions (id, type, title, prompt, tip, score, time_limit, payload) values
('11111111-1111-1111-1111-000000000001',
 'matching',
 '두 수와 최대공약수 연결하기',
 '왼쪽의 두 수와 알맞은 최대공약수를 연결하세요.',
 '두 수를 모두 나누어떨어지게 하는 가장 큰 수를 찾아보세요.',
 80, 150,
 jsonb_build_object(
   'left',    jsonb_build_array(
     jsonb_build_object('id','a','label','(12, 18)'),
     jsonb_build_object('id','b','label','(15, 25)'),
     jsonb_build_object('id','c','label','(8, 20)'),
     jsonb_build_object('id','d','label','(9, 16)')
   ),
   'right',   jsonb_build_array(
     jsonb_build_object('id','1','label','5'),
     jsonb_build_object('id','2','label','1'),
     jsonb_build_object('id','3','label','6'),
     jsonb_build_object('id','4','label','4')
   ),
   'correct', jsonb_build_object('a','3','b','1','c','4','d','2')
 )
),
('11111111-1111-1111-1111-000000000002',
 'multiple_choice',
 '이야기 객관식',
 '상황을 읽고 알맞은 답을 고르세요.',
 '핵심 수치를 표시해 보자.',
 80, 150,
 jsonb_build_object(
   'situation','민지는 사탕 24개를 학생들에게 똑같이 나누어 주려고 합니다.',
   'question','한 명에게 4개씩 주려면 몇 명에게 줄 수 있을까요?',
   'options', jsonb_build_array(
     jsonb_build_object('id','a','label','5명'),
     jsonb_build_object('id','b','label','6명'),
     jsonb_build_object('id','c','label','7명'),
     jsonb_build_object('id','d','label','8명')
   ),
   'correctId','b'
 )
),
('11111111-1111-1111-1111-000000000003',
 'classify',
 '6의 약수 / 6의 배수',
 '아래 수 카드를 알맞은 상자에 분류하세요.',
 '6 자체는 6의 약수이면서 6의 배수예요. 잘 생각해보세요.',
 80, 180,
 jsonb_build_object(
   'cards', jsonb_build_array(1,2,3,5,6,7,12,18,24,25),
   'bins',  jsonb_build_array(
     jsonb_build_object('id','약수', 'label','6의 약수'),
     jsonb_build_object('id','배수', 'label','6의 배수'),
     jsonb_build_object('id','없음', 'label','둘 다 아님')
   ),
   'correct', jsonb_build_object(
     '1','약수','2','약수','3','약수',
     '5','없음','6', jsonb_build_array('약수','배수'),'7','없음',
     '12','배수','18','배수','24','배수','25','없음'
   )
 )
),
('11111111-1111-1111-1111-000000000004',
 'ordering',
 '24의 약수를 작은 수부터',
 '풀에서 카드를 골라 정답 순서대로 배열하세요.',
 '고정된 칸은 그대로 두고 빈 칸만 채우면 돼요.',
 90, 150,
 jsonb_build_object(
   'slotCount',     8,
   'pool',         jsonb_build_array(4,8,12,5,7,9),
   'distractors',  jsonb_build_array(5,7,9),
   'fixed',        jsonb_build_array(
     jsonb_build_object('index',0,'value',1),
     jsonb_build_object('index',1,'value',2),
     jsonb_build_object('index',2,'value',3),
     jsonb_build_object('index',4,'value',6),
     jsonb_build_object('index',7,'value',24)
   ),
   'correctOrder', jsonb_build_array(1,2,3,4,6,8,12,24)
 )
),
('11111111-1111-1111-1111-000000000005',
 'hotspot',
 '8의 배수 모두 찾기',
 '1부터 50까지 중 8의 배수를 모두 선택하세요.',
 '8 × n 을 차례로 떠올려 보자.',
 100, 180,
 jsonb_build_object(
   'rangeFrom', 1,
   'rangeTo',   50,
   'correct',   jsonb_build_array(8,16,24,32,40,48),
   'decoys',    jsonb_build_array(6,18)
 )
),
('11111111-1111-1111-1111-000000000006',
 'slider',
 '16과 24의 최대공약수',
 '슬라이더를 움직여 16과 24의 최대공약수를 찾으세요.',
 '두 수를 모두 나누어떨어지게 하는 가장 큰 수!',
 80, 90,
 jsonb_build_object(
   'a',16,'b',24,'min',1,'max',30,'correct',8
 )
);

-- 퀴즈 세트
insert into gxgtest_quiz_sets (id, name, question_ids) values
('22222222-2222-2222-2222-000000000001',
 '데모 — 6유형 종합',
 array[
   '11111111-1111-1111-1111-000000000001'::uuid,
   '11111111-1111-1111-1111-000000000002'::uuid,
   '11111111-1111-1111-1111-000000000003'::uuid,
   '11111111-1111-1111-1111-000000000004'::uuid,
   '11111111-1111-1111-1111-000000000005'::uuid,
   '11111111-1111-1111-1111-000000000006'::uuid
 ]
);

-- 데모 세션
insert into gxgtest_sessions (id, set_id, room_code, status) values
('33333333-3333-3333-3333-000000000001',
 '22222222-2222-2222-2222-000000000001',
 'DEMO01',
 'waiting'
);
