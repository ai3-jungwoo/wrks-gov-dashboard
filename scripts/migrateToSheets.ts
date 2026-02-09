/**
 * 기존 clients.ts 데이터를 Google Sheets로 마이그레이션하는 스크립트
 *
 * 실행: npx tsx scripts/migrateToSheets.ts
 */

const API_URL = 'https://script.google.com/a/macros/chainpartners.net/s/AKfycbwzFO4EoVbDWBxqT98RN0i9L_xulxECBf80t5wii1HJH0StCl8YRDCfeGr82ldBgW6Brw/exec';

interface UserMetrics {
  activeUsers?: number;
  totalUsers?: number;
}

interface Client {
  name: string;
  activeUsers?: number;
  totalUsers?: number;
}

// 교육청 데이터 (clients.ts에서 복사)
const educationData: Client[] = [
  { name: "서울시교육청", activeUsers: 9314, totalUsers: 39249 },
  { name: "경상북도교육청", activeUsers: 3152, totalUsers: 6702 },
  { name: "전라남도교육청", activeUsers: 1179, totalUsers: 2680 },
  { name: "부산교육청", activeUsers: 3731, totalUsers: 24021 },
  { name: "울산교육청", activeUsers: 362, totalUsers: 457 },
  { name: "대전광역시교육청", totalUsers: 58 },
];

async function saveUserMetrics(
  clientName: string,
  metrics: UserMetrics
): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveUsers',
        clientName,
        activeUsers: metrics.activeUsers ?? '',
        totalUsers: metrics.totalUsers ?? '',
        updatedBy: 'migration-script',
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`${clientName} 저장 실패:`, error);
    return false;
  }
}

async function migrate() {
  console.log('🚀 Google Sheets 마이그레이션 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const client of educationData) {
    if (client.activeUsers || client.totalUsers) {
      const metrics: UserMetrics = {};
      if (client.activeUsers) metrics.activeUsers = client.activeUsers;
      if (client.totalUsers) metrics.totalUsers = client.totalUsers;

      console.log(`📤 ${client.name}: 활성=${client.activeUsers ?? '-'}, 전체=${client.totalUsers ?? '-'}`);

      const success = await saveUserMetrics(client.name, metrics);

      if (success) {
        console.log(`   ✅ 저장 완료`);
        successCount++;
      } else {
        console.log(`   ❌ 저장 실패`);
        failCount++;
      }

      // API 호출 간격 (rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n========================================');
  console.log(`✅ 성공: ${successCount}건`);
  console.log(`❌ 실패: ${failCount}건`);
  console.log('========================================');
}

migrate();
