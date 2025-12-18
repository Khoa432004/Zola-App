/**
 * Script để tạo tài khoản admin
 * Sử dụng: npx ts-node backend/src/scripts/createAdmin.ts
 * Hoặc: npm run create-admin (nếu đã thêm vào package.json)
 */

import "../config/env";
import { Account } from "../models/Account";

async function createAdmin() {
  console.log("🚀 Bắt đầu tạo tài khoản admin...\n");

  // Thông tin tài khoản admin mặc định
  // Bạn có thể thay đổi email và password ở đây
  const adminEmail = process.env.ADMIN_EMAIL || "admin1@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "Admin Zola";

  try {
    // Kiểm tra xem tài khoản admin đã tồn tại chưa
    const existingAdmin = await Account.findByEmail(adminEmail);

    if (existingAdmin) {
      console.log(`⚠️  Tài khoản với email "${adminEmail}" đã tồn tại!`);
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Tên: ${existingAdmin.name}`);
      console.log(`🔑 Role: ${existingAdmin.role}`);

      if (existingAdmin.role === "admin") {
        console.log("\n✅ Tài khoản này đã là admin!");
        console.log(
          "💡 Bạn có thể sử dụng thông tin đăng nhập này để đăng nhập."
        );
      } else {
        console.log(
          "\n🔄 Tài khoản này chưa phải admin. Đang cập nhật role..."
        );
        await Account.update(existingAdmin.id, { role: "admin" });
        console.log("✅ Đã cập nhật role thành admin!");
      }

      console.log("\n📝 Thông tin đăng nhập:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(
        '\n💡 Lưu ý: Nếu bạn không nhớ mật khẩu, hãy sử dụng chức năng "Quên mật khẩu" trên trang đăng nhập.'
      );

      process.exit(0);
      return;
    }

    // Tạo tài khoản admin mới
    console.log("📝 Đang tạo tài khoản admin mới...");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Tên: ${adminName}`);
    console.log(`   Role: admin\n`);

    const adminAccount = await Account.create({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: adminName,
      provider: "email",
      role: "admin",
    });

    console.log("✅ Tạo tài khoản admin thành công!\n");
    console.log("=".repeat(60));
    console.log("📋 THÔNG TIN ĐĂNG NHẬP ADMIN:");
    console.log("=".repeat(60));
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Tên: ${adminName}`);
    console.log(`🆔 ID: ${adminAccount.id}`);
    console.log(`🔐 Role: ${adminAccount.role}`);
    console.log("=".repeat(60));
    console.log("\n💡 Hướng dẫn đăng nhập:");
    console.log(
      "   1. Mở trình duyệt và truy cập: http://localhost:3000/login"
    );
    console.log("   2. Nhập email và password ở trên");
    console.log(
      "   3. Sau khi đăng nhập thành công, bạn sẽ được chuyển đến trang /admin"
    );
    console.log("\n⚠️  LƯU Ý BẢO MẬT:");
    console.log("   - Hãy đổi mật khẩu sau lần đăng nhập đầu tiên!");
    console.log("   - Không chia sẻ thông tin đăng nhập này với người khác!");
    console.log(
      "   - Để thay đổi email/password mặc định, set biến môi trường:"
    );
    console.log("     ADMIN_EMAIL=your-email@example.com");
    console.log("     ADMIN_PASSWORD=your-secure-password");
    console.log("     ADMIN_NAME=Your Admin Name\n");
  } catch (error: any) {
    console.error("❌ Lỗi khi tạo tài khoản admin:", error.message);
    console.error("Chi tiết lỗi:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Chạy script
createAdmin();
