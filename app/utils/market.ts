import {
  MarketType,
  UiMarketHistory,
  UiSpotMarketWithToken,
  UiDerivativeMarketWithToken
} from '@injectivelabs/sdk-ui-ts'
import {
  BigNumber,
  BigNumberInBase,
  SECONDS_IN_A_DAY
} from '@injectivelabs/utils'
import { ExpiryFuturesMarket, PriceLevel } from '@injectivelabs/sdk-ts'
import {
  upcomingMarkets,
  deprecatedMarkets,
  experimentalMarketsSlug,
  slugsToIncludeInCosmosCategory,
  slugsToIncludeInEthereumCategory
} from '@/app/data/market'
import { IS_TESTNET } from '@/app/utils/constants'
import {
  MarketRoute,
  TradeSubPage,
  DefaultMarket,
  MarketQuoteType,
  MarketCategoryType,
  TradingBotsSubPage
} from '@/types'

export const getMarketRoute = (
  market: UiDerivativeMarketWithToken | UiSpotMarketWithToken
): MarketRoute => {
  if (upcomingMarkets.map((m) => m.slug).includes(market.slug)) {
    return {
      name: TradeSubPage.Market,
      params: {
        market: market.slug
      }
    }
  }

  if (deprecatedMarkets.map((m) => m.slug).includes(market.slug)) {
    return {
      name: TradeSubPage.Market,
      params: {
        market: market.slug
      }
    }
  }

  if (market.type === MarketType.Derivative) {
    if (market.subType === MarketType.BinaryOptions) {
      return {
        name: TradeSubPage.BinaryOption,
        params: {
          binaryOption: market.slug
        }
      }
    }

    if ([MarketType.Perpetual, MarketType.Futures].includes(market.subType)) {
      return {
        name: TradeSubPage.Futures,
        params: {
          futures: market.slug
        }
      }
    }

    /* Default derivative market route */
    return {
      name: TradeSubPage.Derivatives,
      params: {
        derivative: market.slug
      }
    }
  }

  if (market.type === MarketType.Spot) {
    return {
      name: TradeSubPage.Spot,
      params: {
        spot: market.slug
      }
    }
  }

  return {
    name: TradeSubPage.Market,
    params: {
      market: market.slug
    }
  }
}

export const getDefaultPerpetualMarketRouteParams = () => {
  return {
    name: TradeSubPage.Futures,
    params: {
      futures: IS_TESTNET
        ? DefaultMarket.PerpetualTestnet
        : DefaultMarket.Perpetual
    }
  }
}

export const getDefaultSpotMarketRouteParams = () => {
  return {
    name: TradeSubPage.Spot,
    params: {
      spot: DefaultMarket.Spot
    }
  }
}

export const getDefaultGridSpotMarketRouteParams = () => {
  return {
    name: TradingBotsSubPage.GridSpotMarket,
    params: {
      market: DefaultMarket.Spot
    }
  }
}

export const marketIsPartOfCategory = (
  activeCategory: MarketCategoryType,
  market: UiDerivativeMarketWithToken | UiSpotMarketWithToken
): boolean => {
  if (activeCategory === MarketCategoryType.All) {
    return true
  }

  const isIbcBaseDenomMarket = market.baseToken.denom.startsWith('ibc')

  if (activeCategory === MarketCategoryType.Cosmos) {
    return (
      isIbcBaseDenomMarket ||
      slugsToIncludeInCosmosCategory.includes(market.slug)
    )
  }

  if (activeCategory === MarketCategoryType.Ethereum) {
    return (
      !isIbcBaseDenomMarket &&
      slugsToIncludeInEthereumCategory.includes(market.slug)
    )
  }

  if (activeCategory === MarketCategoryType.Experimental) {
    return experimentalMarketsSlug.includes(market.slug)
  }

  return true
}

export const marketIsQuotePair = (
  activeQuote: MarketQuoteType,
  market: UiDerivativeMarketWithToken | UiSpotMarketWithToken
): boolean => {
  if (activeQuote === MarketQuoteType.All) {
    return true
  }

  const usdtkvSymbolLowercased = MarketQuoteType.USDTkv.toLowerCase()
  const usdtSymbolLowercased = MarketQuoteType.USDT.toLowerCase()
  const usdcSymbolLowercased = MarketQuoteType.USDC.toLowerCase()
  const injSymbolLowecased = MarketQuoteType.INJ.toLowerCase()
  const marketQuoteSymbol = market.quoteToken.symbol.toLowerCase()

  if (activeQuote === MarketQuoteType.USDTkv) {
    return marketQuoteSymbol.includes(usdtkvSymbolLowercased)
  }

  if (activeQuote === MarketQuoteType.USDT) {
    return marketQuoteSymbol.includes(usdtSymbolLowercased)
  }

  if (activeQuote === MarketQuoteType.USDC) {
    return marketQuoteSymbol.includes(usdcSymbolLowercased)
  }

  if (activeQuote === MarketQuoteType.INJ) {
    return marketQuoteSymbol.includes(injSymbolLowecased)
  }

  return true
}

export const marketIsPartOfType = ({
  activeType,
  market,
  favoriteMarkets
}: {
  activeType: MarketType
  market: UiDerivativeMarketWithToken | UiSpotMarketWithToken
  favoriteMarkets: string[]
}): boolean => {
  if (activeType.trim() === '') {
    return true
  }

  if (activeType === MarketType.Favorite) {
    return favoriteMarkets.includes(market.marketId)
  }

  return [market.type, market.subType].includes(activeType as MarketType)
}

export const marketIsPartOfSearch = (
  search: string,
  market: UiDerivativeMarketWithToken | UiSpotMarketWithToken
): boolean => {
  const query = search.trim().toLowerCase()

  if (query === '') {
    return true
  }

  return (
    market.quoteToken.symbol.toLowerCase().includes(query) ||
    market.baseToken.symbol.toLowerCase().includes(query) ||
    market.ticker.toLowerCase().includes(query)
  )
}

export const getFormattedMarketsHistoryChartData = (
  marketsHistory: UiMarketHistory
) => {
  return marketsHistory.time.map((time, index, times) => {
    const totalPrice =
      marketsHistory.openPrice[index] +
      marketsHistory.highPrice[index] +
      marketsHistory.lowPrice[index] +
      marketsHistory.closePrice[index]

    const yAxisHolcAveragePrice = new BigNumberInBase(totalPrice)
      .dividedBy(4)
      .toNumber()

    const xAxisTime = time - times[0]

    return [xAxisTime, yAxisHolcAveragePrice]
  })
}

export const marketHasRecentlyExpired = (market: ExpiryFuturesMarket) => {
  const now = Date.now() / 1000
  const secondsInADay = SECONDS_IN_A_DAY.toNumber()

  if (!market) {
    return false
  }

  if (!market.expiryFuturesMarketInfo) {
    return false
  }

  if (!market.expiryFuturesMarketInfo.expirationTimestamp) {
    return false
  }

  const isExpired = market.expiryFuturesMarketInfo.expirationTimestamp <= now

  if (!isExpired) {
    return false
  }

  return (
    market.expiryFuturesMarketInfo.expirationTimestamp + secondsInADay > now
  )
}

/**
 * 1. if new exists in current, update quantity in current,
 * 2. if new exists in current and quantity is 0, delete from current
 * 3. If new doesn't exist in current, add to current
 **/
export const updateOrderbookRecord = (
  currentRecords: PriceLevel[] = [],
  updatedRecords: PriceLevel[] = []
) => {
  const newRecords = [...updatedRecords].reduce((records, record) => {
    const existingRecord = currentRecords.find((r) => r.price === record.price)

    return existingRecord ? records : [...records, record]
  }, [] as PriceLevel[])

  const affectedRecords = [...currentRecords].map((record) => {
    const updatedRecord = updatedRecords.find((r) => r.price === record.price)

    if (!updatedRecord) {
      return record
    }

    return {
      ...record,
      quantity: updatedRecord.quantity
    }
  })

  return [...newRecords, ...affectedRecords].filter((record) =>
    new BigNumber(record.quantity).gt(0)
  )
}

export const combineOrderbookRecords = ({
  isBuy,
  updatedRecords = [],
  currentRecords = []
}: {
  isBuy: boolean
  updatedRecords?: PriceLevel[]
  currentRecords?: PriceLevel[]
}) => {
  const combinedOrderbookRecords = updateOrderbookRecord(
    currentRecords,
    updatedRecords
  )

  return combinedOrderbookRecords.sort((a, b) => {
    return isBuy
      ? new BigNumberInBase(b.price).minus(a.price).toNumber()
      : new BigNumberInBase(a.price).minus(b.price).toNumber()
  })
}
