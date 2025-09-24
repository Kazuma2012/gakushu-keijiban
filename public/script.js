async function fetchPosts() {
  const res = await fetch('/posts');
  const posts = await res.json();
  const ul = document.getElementById('posts');
  ul.innerHTML = '';

  posts.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>[${p.category}] ${p.title}</strong> by ${p.author}<br>${p.content}<br>`;

    // コメント一覧
    const commentUl = document.createElement('ul');
    p.comments.forEach(c => {
      const cli = document.createElement('li');
      cli.textContent = `${c.author}: ${c.content}`;
      commentUl.appendChild(cli);
    });
    li.appendChild(commentUl);

    // コメントフォーム
    const commentForm = document.createElement('form');
    commentForm.innerHTML = `名前: <input type="text" class="c-author">
      コメント: <input type="text" class="c-content">
      <button>送信</button>`;
    
    commentForm.addEventListener('submit', async e => {
      e.preventDefault();
      const author = commentForm.querySelector('.c-author').value;
      const content = commentForm.querySelector('.c-content').value;
      await fetch(`/posts/${p.id}/comments`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ author, content })
      });
      fetchPosts();
    });

    li.appendChild(commentForm);
    ul.appendChild(li);
  });
}

// 投稿フォーム
document.getElementById('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const author = document.getElementById('author').value;
  const content = document.getElementById('content').value;
  const category = document.getElementById('category').value;

  await fetch('/posts', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ title, author, content, category })
  });

  document.getElementById('title').value = '';
  document.getElementById('author').value = '';
  document.getElementById('content').value = '';
  fetchPosts();
});

fetchPosts();
