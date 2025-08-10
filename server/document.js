const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

mongoose.connect('mongodb://localhost:27017/collab-db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Document = mongoose.model('Document', new mongoose.Schema({
  _id: String,
  content: String
}));

const defaultValue = "";

io.on('connection', socket => {
  socket.on('get-document', async documentId => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit('load-document', document.content);

    socket.on('send-changes', delta => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async data => {
      await Document.findByIdAndUpdate(documentId, { content: data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;
  const doc = await Document.findById(id);
  if (doc) return doc;
  return await Document.create({ _id: id, content: defaultValue });
}

server.listen(5000, () => console.log('Server running on http://localhost:5000'));
