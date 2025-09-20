import express from 'express';
import { HotwordService } from '../services/HotwordService';

const router = express.Router();
const hotwordService = new HotwordService();

// Get all hotwords
router.get('/', async (req, res) => {
  try {
    const hotwords = await hotwordService.getAllHotwords();
    res.json(hotwords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotwords' });
  }
});

// Create a new hotword
router.post('/', async (req, res) => {
  try {
    const { word } = req.body;
    
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required and must be a string' });
    }
    
    const hotword = await hotwordService.createHotword(word);
    res.status(201).json(hotword);
  } catch (error) {
    if (error instanceof Error && error.message === 'Hotword already exists') {
      res.status(400).json({ error: 'Hotword already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create hotword' });
    }
  }
});

// Update a hotword
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, isActive } = req.body;
    
    const update: {word?: string, isActive?: boolean} = {};
    if (word && typeof word === 'string') {
      update.word = word;
    }
    if (isActive !== undefined && typeof isActive === 'boolean') {
      update.isActive = isActive;
    }
    
    const hotword = await hotwordService.updateHotword(id, update);
    res.json(hotword);
  } catch (error) {
    console.error('Error updating hotword:', error);
    if (error instanceof Error && error.message === 'Hotword not found') {
      res.status(404).json({ error: 'Hotword not found' });
    } else if (error instanceof Error && error.message === 'Hotword already exists') {
      res.status(400).json({ error: 'Hotword already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update hotword' });
    }
  }
});

// Delete a hotword
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await hotwordService.deleteHotword(id);
    res.json({ message: 'Hotword deleted successfully' });
  } catch (error) {
    console.error('Error deleting hotword:', error);
    if (error instanceof Error && error.message === 'Hotword not found') {
      res.status(404).json({ error: 'Hotword not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete hotword' });
    }
  }
});

// Get multiple hotwords by IDs (comma-separated)
router.get('/batch', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'IDs parameter is required' });
    }
    
    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    const hotwords = await hotwordService.getHotwordsByIds(idList);
    res.json(hotwords);
  } catch (error) {
    console.error('Error fetching hotwords by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch hotwords' });
  }
});

export default router;