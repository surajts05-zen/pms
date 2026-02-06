const { User } = require('./models');

async function checkUser() {
    try {
        const email = 'surajss@gmail.com';
        const user = await User.findOne({ where: { email } });
        if (user) {
            console.log('User found:');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Has Password:', !!user.password);
            console.log('Is 2FA Enabled:', user.isTwoFactorEnabled);
            console.log('Google ID:', user.googleId);
        } else {
            console.log('User not found:', email);

            // List all users to see if there's a typo
            const allUsers = await User.findAll();
            console.log('All Users in DB:');
            allUsers.forEach(u => console.log(`- ${u.email}`));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
