import { Router, Request, Response } from 'express';
import {
  getAllCreativeIdeas,
  getCreativeIdeaById,
  createCreativeIdea,
  updateCreativeIdea,
  deleteCreativeIdea,
  reorderCreativeIdeas,
  importCreativeIdeas,
  exportCreativeIdeas,
} from '../services/creativeIdea';
import { ApiResponse, CreativeIdea } from '../types';

const router = Router();

// 获取所有创意
router.get('/', (req: Request, res: Response<ApiResponse<CreativeIdea[]>>) => {
  try {
    const ideas = getAllCreativeIdeas();
    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取创意列表失败',
    });
  }
});

// 获取单个创意
router.get('/:id', (req: Request, res: Response<ApiResponse<CreativeIdea>>) => {
  try {
    const id = parseInt(req.params.id, 10);
    const idea = getCreativeIdeaById(id);
    
    if (!idea) {
      return res.status(404).json({ success: false, error: '创意不存在' });
    }
    
    res.json({ success: true, data: idea });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取创意失败',
    });
  }
});

// 创建创意
router.post('/', (req: Request, res: Response<ApiResponse<CreativeIdea>>) => {
  try {
    const { title, prompt, imageUrl, isSmart, isSmartPlus, isBP, smartPlusConfig, bpFields, cost, order } = req.body;
    
    if (!title || !prompt) {
      return res.status(400).json({ success: false, error: '标题和提示词不能为空' });
    }
    
    const idea = createCreativeIdea({
      title,
      prompt,
      imageUrl: imageUrl || '',
      isSmart: isSmart || false,
      isSmartPlus: isSmartPlus || false,
      isBP: isBP || false,
      smartPlusConfig,
      bpFields,
      cost: cost || 0, // Pebbling 鹅卵石扣除数量
      order: order || 0,
    });
    
    res.status(201).json({ success: true, data: idea });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建创意失败',
    });
  }
});

// 更新创意
router.put('/:id', (req: Request, res: Response<ApiResponse<CreativeIdea>>) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body;
    
    const idea = updateCreativeIdea(id, updates);
    
    if (!idea) {
      return res.status(404).json({ success: false, error: '创意不存在' });
    }
    
    res.json({ success: true, data: idea });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新创意失败',
    });
  }
});

// 删除创意
router.delete('/:id', (req: Request, res: Response<ApiResponse>) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = deleteCreativeIdea(id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: '创意不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除创意失败',
    });
  }
});

// 批量排序
router.post('/reorder', (req: Request, res: Response<ApiResponse>) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    
    reorderCreativeIdeas(orderedIds);
    res.json({ success: true, message: '排序成功' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '排序失败',
    });
  }
});

// 导入创意
router.post('/import', (req: Request, res: Response<ApiResponse<CreativeIdea[]>>) => {
  try {
    const { ideas } = req.body;
    
    if (!Array.isArray(ideas)) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    
    const imported = importCreativeIdeas(ideas);
    res.json({ success: true, data: imported });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
    });
  }
});

// 导出创意
router.get('/export/all', (req: Request, res: Response<ApiResponse<CreativeIdea[]>>) => {
  try {
    const ideas = exportCreativeIdeas();
    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    });
  }
});

export default router;
