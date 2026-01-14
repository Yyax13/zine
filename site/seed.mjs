import 'dotenv/config.js';
import { User, sequelize } from "./controllers/db.js";
import bcrypt from 'bcrypt';

const seedDb = async () => {
    let tx;
    try {
        tx = await sequelize.transaction();

        const adminUser = process.env.SEED_ADMIN_USER;
        const adminPass = process.env.SEED_ADMIN_PASS;
        if (!adminUser || !adminPass) {
            throw new Error('SEED_ADMIN_USER and SEED_ADMIN_PASS must be set in environment');

        }

        // Admin fully defined via .env and must be a worm
        const [admin] = await User.findOrCreate({
            where: { userName: adminUser },
            defaults: { pass: (await bcrypt.hash(adminPass, 12)).toString(), worm: true },
            transaction: tx
        });

        await tx.commit();
        console.log('Database seeding completed.');
        return { admin };
    } catch (err) {
        if (tx) await tx.rollback();
        console.error('Seeding failed:', err);
        throw err;
    }
};

await seedDb();