const express = require('express');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');  // lowdb v6対応

const app = express();
const port = process.env.PORT || 3000;

// DB初期化
const adapter = new JSONFile('db.json');
// 初期値を渡す
const db = new Low(adapter, { posts: [] });

async function initDB() {
  await db.read();
  // db.data が null の場合は初期値を設定
  db.data = db.data || { posts: [] };
  await db.write();
}
initDB();

// ミドルウェア
app.use(bodyParser.json());
app.use(express.static('public'));

// 投稿一覧取得
app.get('/posts', async (req, res) => {
  await db.read();
  const category = req.query.category;
  let posts = db.data.posts;
  if(category) posts = posts.filter(p => p.category === category);
  res.json(posts);
});

// 投稿作成
app.post('/posts', async (req, res) => {
  const { title, author, content, category } = req.body;
  await db.read();
  db.data.posts.push({
    id: Date.now(),
    title,
    author,
    content,
    category,
    comments: [],
    likes: 0,
    solved: false,
    created_at: new Date().toISOString()
  });
  await db.write();
  res.json({ success: true });
});

// コメント作成
app.post('/posts/:postId/comments', async (req, res) => {
  const postId = Number(req.params.postId);
  const { author, content } = req.body;

  await db.read();
  const post = db.data.posts.find(p => p.id === postId);
  if(!post) return res.status(404).json({ error: "投稿が見つかりません" });

  post.comments.push({
    id: Date.now(),
    author,
    content
  });
  await db.write();
  res.json({ success: true });
});

// サーバー起動
app.listen(port, () => console.log(`学習掲示板(コメント対応)動作中: ${port}`));

// 管理画面（/kanri）
app.get('/kanri', async (req, res) => {
  // 管理画面用HTML
  const html = `
  <html>
  <head>
    <title>管理画面</title>
    <style>
      body { font-family: Arial; padding: 20px; }
      .hidden { display:none; }
      .post { border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:5px; }
      .post h3 { margin:0; }
      .comment { margin-left:20px; }
      button { margin-left:5px; }
    </style>
  </head>
  <body>
    <h1>管理画面</h1>
    <div id="login">
      <p>管理キーを入力してください:</p>
      <input type="password" id="keyInput">
      <button onclick="login()">ログイン</button>
    </div>
    <div id="content" class="hidden">
      <p>データ読み込み中…</p>
    </div>

    <script>
      async function login() {
        const key = document.getElementById('keyInput').value;
        if(key !== 'kazuma123'){ alert('キーが違います'); return; }
        document.getElementById('login').classList.add('hidden');
        loadData(key);
      }

      async function loadData(key) {
        const res = await fetch('/kanri/data?key=' + key);
        const posts = await res.json();
        const content = document.getElementById('content');
        content.classList.remove('hidden');
        content.innerHTML = '';

        posts.forEach(p => {
          const div = document.createElement('div');
          div.className = 'post';
          div.innerHTML = \`
            <h3>\${p.title} [\${p.category}]</h3>
            <p>投稿者: \${p.author} | 投稿日: \${p.created_at}</p>
            <button onclick="deletePost(\${p.id}, key)">投稿削除</button>
            <h4>コメント一覧:</h4>
            <ul id="comments-\${p.id}"></ul>
          \`;
          content.appendChild(div);

          const ul = div.querySelector('ul');
          p.comments.forEach(c => {
            const li = document.createElement('li');
            li.className = 'comment';
            li.innerHTML = \`
              \${c.author}: \${c.content}
              <button onclick="deleteComment(\${p.id}, \${c.id}, key)">削除</button>
            \`;
            ul.appendChild(li);
          });
        });
      }

      async function deletePost(postId, key) {
        await fetch('/kanri/delete-post/' + postId + '?key=' + key, {method:'POST'});
        loadData(key);
      }

      async function deleteComment(postId, commentId, key) {
        await fetch('/kanri/delete-comment/' + postId + '/' + commentId + '?key=' + key, {method:'POST'});
        loadData(key);
      }
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// データ取得
app.get('/kanri/data', async (req,res)=>{
  const key = req.query.key;
  if(key !== 'kazuma123') return res.status(403).send('アクセス拒否');

  await db.read();
  res.json(db.data.posts);
});

// 投稿削除
app.post('/kanri/delete-post/:postId', async (req,res)=>{
  const key = req.query.key;
  if(key !== 'kazuma123') return res.status(403).send('アクセス拒否');

  const postId = Number(req.params.postId);
  await db.read();
  db.data.posts = db.data.posts.filter(p=>p.id!==postId);
  await db.write();
  res.send('ok');
});

// コメント削除
app.post('/kanri/delete-comment/:postId/:commentId', async (req,res)=>{
  const key = req.query.key;
  if(key !== 'kazuma123') return res.status(403).send('アクセス拒否');

  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  await db.read();
  const post = db.data.posts.find(p=>p.id===postId);
  if(post){
    post.comments = post.comments.filter(c=>c.id!==commentId);
    await db.write();
  }
  res.send('ok');
});

