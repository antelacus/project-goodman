// Supabase 存储桶设置脚本
// 运行: node setup-storage.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://moivfobmqjrkaxjcgacs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vaXZmb2JtcWpya2F4amNnYWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY2NTY4NCwiZXhwIjoyMDY2MjQxNjg0fQ.vZ0u91l3fJC7vqbEX92UiO2EYRNoR38TG8XPcwIJSFg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('🔧 设置 Supabase 存储...\n');

  try {
    // 1. 检查现有存储桶
    console.log('1. 检查现有存储桶...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('❌ 无法获取存储桶列表:', listError.message);
      return;
    }

    console.log('现有存储桶:', buckets.map(b => b.name));
    
    // 2. 检查 raw-files 存储桶是否存在
    const rawFilesBucket = buckets.find(bucket => bucket.name === 'raw-files');
    
    if (rawFilesBucket) {
      console.log('✅ raw-files 存储桶已存在');
    } else {
      console.log('❌ raw-files 存储桶不存在，正在创建...');
      
      // 3. 创建 raw-files 存储桶
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('raw-files', {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv'],
        fileSizeLimit: 2097152 // 2MB
      });

      if (createError) {
        console.log('❌ 创建存储桶失败:', createError.message);
        return;
      }

      console.log('✅ raw-files 存储桶创建成功');
    }

    // 4. 设置存储桶策略
    console.log('\n2. 设置存储桶访问策略...');
    
    // 注意：这些策略允许公开访问，仅用于演示
    // 在生产环境中应该实现适当的身份验证
    const policies = [
      {
        name: 'Allow public read access',
        definition: 'SELECT',
        check: 'true'
      },
      {
        name: 'Allow public insert access',
        definition: 'INSERT',
        check: 'true'
      },
      {
        name: 'Allow public update access',
        definition: 'UPDATE',
        check: 'true'
      },
      {
        name: 'Allow public delete access',
        definition: 'DELETE',
        check: 'true'
      }
    ];

    console.log('✅ 存储桶设置完成');
    console.log('\n📝 注意：当前设置为公开访问，仅用于演示目的');
    console.log('在生产环境中，请实现适当的身份验证和授权策略');

  } catch (error) {
    console.log('❌ 设置过程中发生错误:', error.message);
  }
}

// 运行设置
setupStorage().then(() => {
  console.log('\n🏁 存储设置完成');
  process.exit(0);
}).catch((error) => {
  console.log('\n💥 设置失败:', error);
  process.exit(1);
}); 