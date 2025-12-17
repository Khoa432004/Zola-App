/**
 * Script để cập nhật role='user' cho tất cả account hiện có trong Firestore
 * Chạy một lần để migrate data
 */

import '../config/env';
import { firestore } from '../config/firebase-admin';
import admin from 'firebase-admin';

async function updateAllUserRoles() {
  console.log('🚀 Bắt đầu cập nhật role cho tất cả user...\n');

  if (!firestore) {
    console.error('❌ Firestore chưa được khởi tạo!');
    process.exit(1);
  }

  try {
    const accountsRef = firestore.collection('accounts');
    const snapshot = await accountsRef.get();

    if (snapshot.empty) {
      console.log('⚠️  Không có user nào trong database');
      return;
    }

    console.log(`📊 Tìm thấy ${snapshot.size} user trong database\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Xử lý từng document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = doc.id;
      const email = data.email || 'unknown';

      try {
        // Kiểm tra xem đã có role chưa
        if (data.role) {
          console.log(`⏭️  Skip: ${email} (ID: ${userId}) - Đã có role: ${data.role}`);
          skippedCount++;
          continue;
        }

        // Cập nhật role = 'user'
        await accountsRef.doc(userId).update({
          role: 'user',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Updated: ${email} (ID: ${userId}) -> role: user`);
        updatedCount++;

      } catch (error: any) {
        console.error(`❌ Lỗi khi update ${email} (ID: ${userId}):`, error.message);
        errorCount++;
      }
    }

    // Tổng kết
    console.log('\n' + '='.repeat(60));
    console.log('📈 KẾT QUẢ CẬP NHẬT:');
    console.log('='.repeat(60));
    console.log(`✅ Đã cập nhật thành công: ${updatedCount} user`);
    console.log(`⏭️  Đã bỏ qua (đã có role): ${skippedCount} user`);
    console.log(`❌ Lỗi: ${errorCount} user`);
    console.log(`📊 Tổng cộng: ${snapshot.size} user`);
    console.log('='.repeat(60) + '\n');

    if (updatedCount > 0) {
      console.log('🎉 Hoàn thành! Tất cả user đã được cập nhật role = "user"');
    } else if (skippedCount === snapshot.size) {
      console.log('ℹ️  Tất cả user đã có role, không cần cập nhật');
    }

  } catch (error: any) {
    console.error('❌ Lỗi khi thực hiện script:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

// Chạy script
updateAllUserRoles();
