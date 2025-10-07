#!/bin/bash

# 3000번부터 3010번 포트를 사용하는 프로세스 종료 스크립트

echo "포트 3000-3010을 사용하는 프로세스를 찾는 중..."

# 종료된 프로세스 카운트
killed_count=0

# 3000부터 3010까지 반복
for port in {3000..3010}
do
    # 해당 포트를 사용하는 프로세스 찾기
    pid=$(lsof -ti :$port)
    
    if [ ! -z "$pid" ]; then
        echo "포트 $port 에서 프로세스 발견 (PID: $pid)"
        
        # 프로세스 정보 출력
        ps -p $pid -o pid,comm,args | tail -n +2
        
        # 프로세스 종료
        kill -9 $pid
        
        if [ $? -eq 0 ]; then
            echo "✓ 프로세스 $pid 종료 완료"
            ((killed_count++))
        else
            echo "✗ 프로세스 $pid 종료 실패"
        fi
        echo ""
    fi
done

if [ $killed_count -eq 0 ]; then
    echo "포트 3000-3010을 사용하는 프로세스가 없습니다."
else
    echo "총 $killed_count 개의 프로세스를 종료했습니다."
fi