import { supabase } from './services/supabase';

/**
 * Database Setup Script
 * Run this once to populate initial data in your Supabase database
 */

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // 1. Add Expense Categories
    console.log('📝 Adding Expense Categories...');
    const expenseCategories = [
      { name: 'Utilities', type: 'EXPENSE' },
      { name: 'Salaries', type: 'EXPENSE' },
      { name: 'Rent', type: 'EXPENSE' },
      { name: 'Transportation', type: 'EXPENSE' },
      { name: 'Maintenance', type: 'EXPENSE' },
      { name: 'Supplies', type: 'EXPENSE' },
      { name: 'Miscellaneous', type: 'EXPENSE' },
    ];

    const { data: expData, error: expError } = await supabase
      .from('categories')
      .insert(expenseCategories)
      .select();

    if (expError) {
      console.error('❌ Error adding expense categories:', expError);
    } else {
      console.log(`✅ Added ${expData?.length} expense categories`);
    }

    // 2. Add Income Categories
    console.log('\n📝 Adding Income Categories...');
    const incomeCategories = [
      { name: 'Product Sales', type: 'INCOME' },
      { name: 'Services', type: 'INCOME' },
      { name: 'Other Income', type: 'INCOME' },
    ];

    const { data: incData, error: incError } = await supabase
      .from('categories')
      .insert(incomeCategories)
      .select();

    if (incError) {
      console.error('❌ Error adding income categories:', incError);
    } else {
      console.log(`✅ Added ${incData?.length} income categories`);
    }

    // 3. Add Sample Products
    console.log('\n📦 Adding Sample Products...');
    const products = [
      { name: 'Milk (1L)', unit: 'Liter', sale_price: 2.50, current_opening_stock: 0 },
      { name: 'Yogurt (500g)', unit: 'Gram', sale_price: 3.00, current_opening_stock: 0 },
      { name: 'Cheese (250g)', unit: 'Gram', sale_price: 5.00, current_opening_stock: 0 },
      { name: 'Butter (200g)', unit: 'Gram', sale_price: 4.50, current_opening_stock: 0 },
      { name: 'Cream (250ml)', unit: 'ML', sale_price: 3.50, current_opening_stock: 0 },
    ];

    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (prodError) {
      console.error('❌ Error adding products:', prodError);
    } else {
      console.log(`✅ Added ${prodData?.length} products`);
    }

    // 4. Add Default Admin User
    console.log('\n👤 Adding Default Admin User...');
    const defaultUser = {
      username: 'admin',
      pin: '1234',
      name: 'Administrator',
      role: 'OWNER',
      permissions: ['*']
    };

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([defaultUser])
      .select();

    if (userError) {
      console.error('❌ Error adding user:', userError);
    } else {
      console.log(`✅ Added user: ${userData?.[0]?.name}`);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   PIN: 1234');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  }
}

// Run the setup
setupDatabase();
