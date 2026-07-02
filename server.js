const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

// Inicializa o Firebase Admin SDK
let serviceAccount;
try {
  // Tenta ler a variável de ambiente (no Render)
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    // Se não tiver variável, tenta ler o arquivo local
    serviceAccount = require('./serviceAccountKey.json'); // ou o nome que você deixou
  }
} catch (err) {
  console.error("Erro ao carregar as credenciais do Firebase:", err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limite aumentado para aceitar imagens em base64

// Serve os arquivos estáticos do frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// ROTAS DA API
// ==========================================

// --- Categorias ---
app.get('/api/categories', async (req, res) => {
  try {
    const snapshot = await db.collection('categorias').get();
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, name: doc.data().name });
    });
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const lowerName = name.toLowerCase();
    
    // Verifica se já existe (simplificado)
    const snapshot = await db.collection('categorias').where('name', '==', lowerName).get();
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }

    const docRef = await db.collection('categorias').add({ name: lowerName });
    res.status(201).json({ id: docRef.id, name: lowerName });
  } catch (error) {
    console.error('Erro ao adicionar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('categorias').doc(id).delete();
    res.json({ message: 'Categoria excluída' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// --- Produtos ---
app.get('/api/products', async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, stock, image, category, price } = req.body;
    
    const newProduct = {
      name,
      stock: parseInt(stock, 10),
      image: image || null,
      category: category || 'Outros',
      price: parseFloat(price) || 0,
      discountPercentage: 0
    };

    const docRef = await db.collection('produtos').add(newProduct);
    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stock, image, category, price } = req.body;

    const updateData = {
      name,
      stock: parseInt(stock, 10),
      category: category || 'Outros',
      price: parseFloat(price) || 0
    };
    
    if (image) {
      updateData.image = image;
    }

    await db.collection('produtos').doc(id).update(updateData);
    res.json({ message: 'Produto atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/api/products/:id/promo', async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body;
    
    await db.collection('produtos').doc(id).update({
      discountPercentage: percentage ? parseInt(percentage, 10) : 0
    });
    res.json({ message: 'Promoção atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar promoção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('produtos').doc(id).delete();
    res.json({ message: 'Produto excluído' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Fallback para rota principal
app.get('/', (req, res) => {
  res.json({ message: 'API Hisa Backend funcionando perfeitamente!' });
});

// Fallback para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
