import { query, queryOne, execute, getChanges } from './database';
import { CreativeIdea, SmartPlusConfig, BPField } from '../types';

interface CreativeIdeaRow {
  id: number;
  title: string;
  prompt: string;
  imageUrl: string;
  isSmart: number;
  isSmartPlus: number;
  isBP: number;
  smartPlusConfig: string | null;
  bpFields: string | null;
  cost: number | null; // Pebbling 鹅卵石扣除数量
  order: number;
  createdAt: number;
  updatedAt: number;
}

// 将数据库行转换为 CreativeIdea
function rowToCreativeIdea(row: CreativeIdeaRow): CreativeIdea {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    imageUrl: row.imageUrl,
    isSmart: row.isSmart === 1,
    isSmartPlus: row.isSmartPlus === 1,
    isBP: row.isBP === 1,
    smartPlusConfig: row.smartPlusConfig ? JSON.parse(row.smartPlusConfig) : undefined,
    bpFields: row.bpFields ? JSON.parse(row.bpFields) : undefined,
    cost: row.cost || undefined, // Pebbling 鹅卵石扣除数量
    order: row.order,
  };
}

// 获取所有创意
export function getAllCreativeIdeas(): CreativeIdea[] {
  const rows = query<CreativeIdeaRow>(
    'SELECT * FROM creative_ideas ORDER BY "order" ASC, id ASC'
  );
  return rows.map(rowToCreativeIdea);
}

// 根据 ID 获取创意
export function getCreativeIdeaById(id: number): CreativeIdea | null {
  const row = queryOne<CreativeIdeaRow>(
    'SELECT * FROM creative_ideas WHERE id = ?',
    [id]
  );
  return row ? rowToCreativeIdea(row) : null;
}

// 创建创意
export function createCreativeIdea(idea: Omit<CreativeIdea, 'id'>): CreativeIdea {
  const id = execute(
    `INSERT INTO creative_ideas (title, prompt, imageUrl, isSmart, isSmartPlus, isBP, smartPlusConfig, bpFields, cost, "order")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idea.title,
      idea.prompt,
      idea.imageUrl || '',
      idea.isSmart ? 1 : 0,
      idea.isSmartPlus ? 1 : 0,
      idea.isBP ? 1 : 0,
      idea.smartPlusConfig ? JSON.stringify(idea.smartPlusConfig) : null,
      idea.bpFields ? JSON.stringify(idea.bpFields) : null,
      idea.cost || 0, // Pebbling 鹅卵石扣除数量，默认0
      idea.order || 0,
    ]
  );

  return { ...idea, id } as CreativeIdea;
}

// 更新创意
export function updateCreativeIdea(id: number, idea: Partial<CreativeIdea>): CreativeIdea | null {
  const existing = getCreativeIdeaById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: any[] = [];

  if (idea.title !== undefined) {
    updates.push('title = ?');
    params.push(idea.title);
  }
  if (idea.prompt !== undefined) {
    updates.push('prompt = ?');
    params.push(idea.prompt);
  }
  if (idea.imageUrl !== undefined) {
    updates.push('imageUrl = ?');
    params.push(idea.imageUrl);
  }
  if (idea.isSmart !== undefined) {
    updates.push('isSmart = ?');
    params.push(idea.isSmart ? 1 : 0);
  }
  if (idea.isSmartPlus !== undefined) {
    updates.push('isSmartPlus = ?');
    params.push(idea.isSmartPlus ? 1 : 0);
  }
  if (idea.isBP !== undefined) {
    updates.push('isBP = ?');
    params.push(idea.isBP ? 1 : 0);
  }
  if (idea.smartPlusConfig !== undefined) {
    updates.push('smartPlusConfig = ?');
    params.push(idea.smartPlusConfig ? JSON.stringify(idea.smartPlusConfig) : null);
  }
  if (idea.bpFields !== undefined) {
    updates.push('bpFields = ?');
    params.push(idea.bpFields ? JSON.stringify(idea.bpFields) : null);
  }
  // 添加 cost 字段的更新处理
  if (idea.cost !== undefined) {
    updates.push('cost = ?');
    params.push(idea.cost || 0);
  }
  if (idea.order !== undefined) {
    updates.push('"order" = ?');
    params.push(idea.order);
  }

  if (updates.length === 0) return existing;

  updates.push('updatedAt = ?');
  params.push(Math.floor(Date.now() / 1000));
  params.push(id);

  execute(
    `UPDATE creative_ideas SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getCreativeIdeaById(id);
}

// 删除创意
export function deleteCreativeIdea(id: number): boolean {
  execute('DELETE FROM creative_ideas WHERE id = ?', [id]);
  return getChanges() > 0;
}

// 批量更新排序
export function reorderCreativeIdeas(orderedIds: number[]): void {
  orderedIds.forEach((id, index) => {
    execute('UPDATE creative_ideas SET "order" = ? WHERE id = ?', [index, id]);
  });
}

// 批量导入创意
export function importCreativeIdeas(ideas: Omit<CreativeIdea, 'id'>[]): CreativeIdea[] {
  return ideas.map(idea => createCreativeIdea(idea));
}

// 导出所有创意
export function exportCreativeIdeas(): CreativeIdea[] {
  return getAllCreativeIdeas();
}
