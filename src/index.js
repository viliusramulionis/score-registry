import express from 'express';
import expressWs from 'express-ws';
import 'dotenv/config'

console.log(process.env);

const app = express();
expressWs(app);
const PORT = process.env.PORT || 3000;
const clients = new Set();

const pushToClients = (data) => {
  const message = JSON.stringify(data); 
  clients.forEach((client) => {
    if (client.readyState === 1) { // 1 means OPEN
      client.send(message);
    }
  });
};  

const players = [];

app.use(express.json());

app.use('/static', express.static('./src/assets/images'));

app.ws('/updates', (ws, req) => {
  console.log('Client connected');
  clients.add(ws);

  // Send initial value
  ws.send(JSON.stringify({ players }));

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

app.get('/', (req, res) => {
  res.sendFile('./src/view/index.html', { root: process.cwd() });
});

app.get('/admin', (req, res) => {
  res.sendFile('./src/view/admin.html', { root: process.cwd() });
});

app.get('/api/players', (req, res) => {
  res.status(200).json(players);
});

app.post('/api/add-players', (req, res) => {
  const data = req.body;
  if (data && data.name) {
    players.push({ id: players.length + 1, name: data.name, points: 0 });
    res.status(200).json({ message: 'Player added', player: players[players.length - 1] });

    pushToClients({ players });
  } else {
    res.status(400).json({ message: 'Invalid player data' });
  }
});

app.put('/api/update-score/:id', (req, res) => {
  const playerId = parseInt(req.params.id, 10);
  const { points } = req.body;
  const player = players.find(p => p.id === playerId);
  if (player) {
    player.points = points;
    res.status(200).json({ message: 'Player score updated', player });

    pushToClients({ players });
  } else {
    res.status(404).json({ message: 'Player not found' });
  }

  console.log(players);
});

app.delete('/api/delete-player/:id', (req, res) => {  
  const playerId = parseInt(req.params.id, 10);
  const index = players.findIndex(p => p.id === playerId);  
  if (index !== -1) {
    const deletedPlayer = players.splice(index, 1);
    res.status(200).json({ message: 'Player deleted', player: deletedPlayer[0] });

    pushToClients({ players }); 
  } else {
    res.status(404).json({ message: 'Player not found' });
  } 
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});