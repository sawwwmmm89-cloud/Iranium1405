import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function main() {
  console.log('🌱 Starting database seed...');

  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@bama.ir';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_INITIAL_NAME || 'مدیر کل سامانه';

  // 1. Create or ensure Super Admin exists
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const passwordHash = await argon2.hash(adminPassword, ARGON_OPTIONS);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Super Admin created: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Super Admin already exists: ${adminEmail}`);
  }

  // 2. Create instructor profile for super admin if missing
  const instructor = await prisma.instructor.findFirst({
    where: { userId: admin.id },
  });

  if (!instructor) {
    await prisma.instructor.create({
      data: {
        userId: admin.id,
        name: admin.name,
        slug: 'admin',
        bio: 'مدرس و مدیر ارشد پلتفرم آموزشی باما',
      },
    });
    console.log(`✅ Instructor profile created for ${admin.name}`);
  }

  // 3. Create default category if no category exists
  const existingCategory = await prisma.category.findFirst();
  if (!existingCategory) {
    await prisma.category.create({
      data: {
        name: 'برنامه‌نویسی و توسعه وب',
        slug: 'programming',
      },
    });
    console.log('✅ Default category created: برنامه‌نویسی و توسعه وب (programming)');
  }

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log(`Login URL:      /login`);
  console.log(`Admin Panel:    /admin`);
  console.log(`Admin Email:    ${adminEmail}`);
  console.log(`Admin Password: ${adminPassword}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error while seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
