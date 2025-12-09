/**
 * Pebbling 鹅卵石充值弹窗
 */
import React, { useState } from 'react';
import { post } from '../services/api';

interface RechargeOption {
  coins: number;
  price: number;
  popular?: boolean;
}

const RECHARGE_OPTIONS: RechargeOption[] = [
  { coins: 100, price: 10 },
  { coins: 200, price: 20, popular: true },
  { coins: 500, price: 50 },
  { coins: 1000, price: 100 },
];

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onRechargeSuccess?: (newBalance: number) => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onRechargeSuccess,
}) => {
  const [selectedOption, setSelectedOption] = useState<RechargeOption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecharge = async () => {
    if (!selectedOption) return;
    
    setIsProcessing(true);
    
    try {
      // 调用后端充值接口
      const result = await post<{ newBalance: number }>('/coins/recharge-self', {
        coins: selectedOption.coins,
        price: selectedOption.price,
      });
      
      if (result.success && result.data) {
        // 充值成功
        onRechargeSuccess?.(result.data.newBalance);
        alert(`🎉 充值成功！\n\n+${selectedOption.coins} Pebbling 鹅卵石 已到账\n当前余额：${result.data.newBalance} 鹅卵石`);
        setSelectedOption(null);
        onClose();
      } else {
        alert(result.error || '充值失败，请稍后重试');
      }
    } catch (e) {
      console.error('Recharge failed:', e);
      alert('充值失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <span className="text-2xl">🪙</span>
            Pebbling 鹅卵石充值
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            当前余额: <span className="text-yellow-400 font-bold">{currentBalance}</span> 鹅卵石
          </p>
        </div>

        {/* 充值选项 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {RECHARGE_OPTIONS.map((option) => (
            <button
              key={option.coins}
              onClick={() => setSelectedOption(option)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                selectedOption?.coins === option.coins
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              {option.popular && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold rounded-full">
                  热门
                </span>
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🪙</span>
                <span className="text-lg font-bold text-white">{option.coins}</span>
                <span className="text-xs text-gray-400">鹅卵石</span>
                <div className="mt-2 px-3 py-1 bg-gray-800 rounded-full">
                  <span className="text-sm font-bold text-green-400">¥{option.price}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 充值说明 */}
        <div className="bg-gray-900/50 rounded-lg p-3 mb-4 text-xs text-gray-400 space-y-1">
          <p>💡 Pebbling 鹅卵石可用于：生成图像、图像分析等AI功能</p>
          <p>📌 充值后不可退款，请谨慎选择</p>
          <p>🎁 首次充值可联系客服领取额外奖励~</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleRecharge}
            disabled={!selectedOption || isProcessing}
            className={`flex-1 px-4 py-2.5 font-semibold rounded-lg transition-all ${
              selectedOption && !isProcessing
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                处理中...
              </span>
            ) : selectedOption ? (
              `支付 ¥${selectedOption.price}`
            ) : (
              '请选择充值金额'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
