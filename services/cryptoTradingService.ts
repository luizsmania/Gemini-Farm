import { CryptoId, Order, CryptoPosition, CryptoPortfolio, OrderType } from '../types';
import { getCurrentPrice } from './cryptoMarketService';
import { MARKET_ORDER_FEE, MIN_TRADE_AMOUNT, INITIAL_CASH_BALANCE } from '../cryptoConstants';

// Create a new order
export const createOrder = (
  portfolio: CryptoPortfolio,
  cryptoId: CryptoId,
  type: OrderType,
  side: 'buy' | 'sell',
  quantity: number,
  price?: number,
  stopPrice?: number
): { order: Order | null; error: string | null } => {
  const currentPrice = getCurrentPrice(cryptoId);
  
  // Validate quantity
  if (quantity <= 0) {
    return { order: null, error: 'Quantity must be greater than 0' };
  }
  
  // Handle market orders
  if (type === 'market') {
    const orderPrice = currentPrice;
    const totalCost = quantity * orderPrice;
    
    if (side === 'buy') {
      // Check if user has enough cash (including fees)
      const totalCostWithFees = totalCost * (1 + MARKET_ORDER_FEE);
      if (portfolio.cashBalance < totalCostWithFees) {
        return { 
          order: null, 
          error: `Insufficient funds. Need $${totalCostWithFees.toFixed(2)}, have $${portfolio.cashBalance.toFixed(2)}` 
        };
      }
      
      // Check minimum trade amount
      if (totalCost < MIN_TRADE_AMOUNT) {
        return { 
          order: null, 
          error: `Minimum trade amount is $${MIN_TRADE_AMOUNT}` 
        };
      }
      
      // Execute immediately for market orders
      return executeMarketBuy(portfolio, cryptoId, quantity, orderPrice);
    } else {
      // Sell
      const position = portfolio.positions[cryptoId];
      if (!position || position.quantity < quantity) {
        return { 
          order: null, 
          error: `Insufficient holdings. You have ${position?.quantity || 0} ${cryptoId}` 
        };
      }
      
      // Execute immediately for market orders
      return executeMarketSell(portfolio, cryptoId, quantity, orderPrice);
    }
  }
  
  // Handle limit orders
  if (type === 'limit' && price !== undefined) {
    if (side === 'buy' && price > currentPrice) {
      return { 
        order: null, 
        error: 'Limit buy price must be below or equal to current price' 
      };
    }
    if (side === 'sell' && price < currentPrice) {
      return { 
        order: null, 
        error: 'Limit sell price must be above or equal to current price' 
      };
    }
  }
  
  // Handle stop-loss orders
  if (type === 'stop_loss' && stopPrice !== undefined) {
    if (side === 'sell' && stopPrice >= currentPrice) {
      return { 
        order: null, 
        error: 'Stop-loss price must be below current price' 
      };
    }
  }
  
  // Handle take-profit orders
  if (type === 'take_profit' && price !== undefined) {
    if (side === 'sell' && price <= currentPrice) {
      return { 
        order: null, 
        error: 'Take-profit price must be above current price' 
      };
    }
  }
  
  // Create pending order
  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cryptoId,
    type,
    side,
    quantity,
    price,
    stopPrice,
    status: 'pending',
    createdAt: Date.now()
  };
  
  return { order, error: null };
};

// Execute market buy order
const executeMarketBuy = (
  portfolio: CryptoPortfolio,
  cryptoId: CryptoId,
  quantity: number,
  price: number
): { order: Order | null; error: string | null } => {
  const totalCost = quantity * price;
  const fee = totalCost * MARKET_ORDER_FEE;
  const totalCostWithFees = totalCost + fee;
  
  if (portfolio.cashBalance < totalCostWithFees) {
    return { order: null, error: 'Insufficient funds' };
  }
  
  // Update cash balance
  portfolio.cashBalance -= totalCostWithFees;
  
  // Update or create position
  const existingPosition = portfolio.positions[cryptoId];
  if (existingPosition) {
    // Calculate new average buy price
    const totalQuantity = existingPosition.quantity + quantity;
    const totalInvested = existingPosition.totalInvested + totalCost;
    existingPosition.averageBuyPrice = totalInvested / totalQuantity;
    existingPosition.quantity = totalQuantity;
    existingPosition.totalInvested = totalInvested;
    existingPosition.lastBoughtAt = Date.now();
  } else {
    portfolio.positions[cryptoId] = {
      cryptoId,
      quantity,
      averageBuyPrice: price,
      totalInvested: totalCost,
      firstBoughtAt: Date.now(),
      lastBoughtAt: Date.now()
    };
  }
  
  // Create executed order
  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cryptoId,
    type: 'market',
    side: 'buy',
    quantity,
    price,
    executedPrice: price,
    status: 'filled',
    createdAt: Date.now(),
    executedAt: Date.now()
  };
  
  // Update portfolio stats
  updatePortfolioValue(portfolio);
  
  return { order, error: null };
};

// Execute market sell order
const executeMarketSell = (
  portfolio: CryptoPortfolio,
  cryptoId: CryptoId,
  quantity: number,
  price: number
): { order: Order | null; error: string | null } => {
  const position = portfolio.positions[cryptoId];
  
  if (!position || position.quantity < quantity) {
    return { order: null, error: 'Insufficient holdings' };
  }
  
  const saleValue = quantity * price;
  const fee = saleValue * MARKET_ORDER_FEE;
  const netProceeds = saleValue - fee;
  
  // Update cash balance
  portfolio.cashBalance += netProceeds;
  
  // Update position
  position.quantity -= quantity;
  position.totalInvested -= (quantity * position.averageBuyPrice);
  
  // Remove position if quantity is zero
  if (position.quantity <= 0.0001) { // Small threshold for floating point
    delete portfolio.positions[cryptoId];
  }
  
  // Create executed order
  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cryptoId,
    type: 'market',
    side: 'sell',
    quantity,
    price,
    executedPrice: price,
    status: 'filled',
    createdAt: Date.now(),
    executedAt: Date.now()
  };
  
  // Update portfolio stats
  updatePortfolioValue(portfolio);
  
  return { order, error: null };
};

// Process pending orders (limit, stop-loss, take-profit)
export const processPendingOrders = (portfolio: CryptoPortfolio): Order[] => {
  const executedOrders: Order[] = [];
  const currentPrices: Record<CryptoId, number> = {} as Record<CryptoId, number>;
  
  // Process each pending order
  portfolio.orders.forEach(order => {
    if (order.status !== 'pending') return;
    
    // Get current price (cache it)
    if (!currentPrices[order.cryptoId]) {
      currentPrices[order.cryptoId] = getCurrentPrice(order.cryptoId);
    }
    const currentPrice = currentPrices[order.cryptoId];
    
    let shouldExecute = false;
    let executePrice = currentPrice;
    
    // Check limit orders
    if (order.type === 'limit' && order.price !== undefined) {
      if (order.side === 'buy' && currentPrice <= order.price) {
        shouldExecute = true;
        executePrice = order.price;
      } else if (order.side === 'sell' && currentPrice >= order.price) {
        shouldExecute = true;
        executePrice = order.price;
      }
    }
    
    // Check stop-loss orders
    if (order.type === 'stop_loss' && order.stopPrice !== undefined) {
      if (order.side === 'sell' && currentPrice <= order.stopPrice) {
        shouldExecute = true;
        executePrice = currentPrice; // Market order at stop price
      }
    }
    
    // Check take-profit orders
    if (order.type === 'take_profit' && order.price !== undefined) {
      if (order.side === 'sell' && currentPrice >= order.price) {
        shouldExecute = true;
        executePrice = order.price;
      }
    }
    
    if (shouldExecute) {
      // Execute the order
      const result = order.side === 'buy'
        ? executeMarketBuy(portfolio, order.cryptoId, order.quantity, executePrice)
        : executeMarketSell(portfolio, order.cryptoId, order.quantity, executePrice);
      
      if (result.order) {
        order.status = 'filled';
        order.executedPrice = executePrice;
        order.executedAt = Date.now();
        executedOrders.push(order);
      }
    }
  });
  
  // Remove filled orders
  portfolio.orders = portfolio.orders.filter(o => o.status !== 'filled');
  
  return executedOrders;
};

// Cancel an order
export const cancelOrder = (
  portfolio: CryptoPortfolio,
  orderId: string
): boolean => {
  const orderIndex = portfolio.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return false;
  
  const order = portfolio.orders[orderIndex];
  if (order.status !== 'pending') return false;
  
  order.status = 'cancelled';
  portfolio.orders.splice(orderIndex, 1);
  
  return true;
};

// Calculate portfolio value
export const updatePortfolioValue = (portfolio: CryptoPortfolio): void => {
  let cryptoValue = 0;
  let totalInvested = 0;
  
  Object.values(portfolio.positions).forEach(position => {
    const currentPrice = getCurrentPrice(position.cryptoId);
    cryptoValue += position.quantity * currentPrice;
    totalInvested += position.totalInvested;
  });
  
  portfolio.totalValue = portfolio.cashBalance + cryptoValue;
  portfolio.totalInvested = totalInvested + (portfolio.cashBalance > 0 ? 
    portfolio.cashBalance - INITIAL_CASH_BALANCE : 0);
  portfolio.totalProfit = portfolio.totalValue - INITIAL_CASH_BALANCE;
};

// Initialize portfolio
export const createInitialPortfolio = (): CryptoPortfolio => {
  return {
    cashBalance: INITIAL_CASH_BALANCE,
    positions: {} as Record<CryptoId, CryptoPosition>,
    orders: [],
    totalValue: INITIAL_CASH_BALANCE,
    totalInvested: 0,
    totalProfit: 0
  };
};
