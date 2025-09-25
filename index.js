const express = require('express');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');  // lowdb v6対応

const app = express();
const port = process.env.PORT || 3000;

// DB初期化
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data = db.data || { posts: [] };  // 初期データを設定
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
