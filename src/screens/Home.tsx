import {
  commodityCategories,
  commodityOptionChain,
  commodityScalper,
  crudeSeries,
  indexScalper,
  indices,
  niftySeries,
  recentlyViewed,
  topTradedCommodity,
  topTradedFutures,
} from "../data";
import { AnalysisModule } from "../ui/chart";
import { Icon } from "../ui/Icon";
import {
  AiSignals,
  Block,
  CardGrid,
  CategoryGrid,
  CommodityRows,
  GiftNifty,
  HScroll,
  HoldingsSummary,
  QuoteCard,
  Scanners,
  SectorHeatmap,
  ToolPills,
} from "../ui/widgets";

const chips = ["Price", "OI", "Change in OI", "ATM Straddle", "PCR", "Max Pain"];

function IndicesBlock({ divided = true }: { divided?: boolean }) {
  return (
    <Block title="Indices" divided={divided}>
      <HScroll>
        {indices.map((quote) => (
          <QuoteCard key={quote.name} {...quote} />
        ))}
      </HScroll>
      <GiftNifty />
    </Block>
  );
}

export function FnoHome() {
  return (
    <main className="dashboard home-feed">
      <IndicesBlock divided={false} />

      <Block>
        <AnalysisModule
          title="NIFTY50"
          change="0.44%"
          tone="up"
          trend={{ label: "Downtrend", since: "Since 03:00 PM, 09 Oct", icon: "trend-down", tone: "down" }}
          chips={chips}
          series={niftySeries}
          yTicks={[["22580", 0], ["22500", 0.2], ["22400", 0.445], ["22300", 0.69], ["22200", 1]]}
          badge="22520.5"
          xLabels={[["02:45 PM", "8 Oct"], ["03:25 PM", "9 Oct"]]}
        />
        <p className="subhead">Trade index options</p>
        <ToolPills />
      </Block>

      <Block>
        <AiSignals />
      </Block>

      <Block title="Holdings Summary">
        <HoldingsSummary />
      </Block>

      <Block title="Stock Scanners">
        <Scanners />
      </Block>

      <Block title="Index Scalper">
        <CardGrid items={indexScalper} />
      </Block>
    </main>
  );
}

export function StocksHome() {
  return (
    <main className="dashboard home-feed">
      <Block title="Recently Viewed" divided={false}>
        <HScroll>
          {recentlyViewed.map((quote) => (
            <QuoteCard key={quote.name} {...quote} />
          ))}
        </HScroll>
      </Block>

      <Block title="Stock Scanners">
        <Scanners />
      </Block>

      <Block
        title="Sector Heatmap"
        action={
          <span className="heatmap-actions">
            1 Day
            <i />
            <Icon name="share-network" size={20} />
          </span>
        }
      >
        <SectorHeatmap />
      </Block>

      <Block title="Holdings Summary">
        <HoldingsSummary />
      </Block>

      <Block>
        <AiSignals />
      </Block>

      <IndicesBlock />
    </main>
  );
}

export function CommoditiesHome() {
  return (
    <main className="dashboard home-feed">
      <Block title="Top Traded Commodity" divided={false}>
        <CommodityRows rows={topTradedCommodity} />
      </Block>

      <Block>
        <AnalysisModule
          title="Crude Oil Mini"
          change="0.26%"
          exchange="MCX"
          tone="down"
          trend={{ label: "Sideways", since: "Since 11:05 PM, 09 Oct", icon: "wave-sine", tone: "flat" }}
          chips={chips}
          series={crudeSeries}
          yTicks={[["8916", 0], ["8850", 0.33], ["8800", 0.58], ["8717", 1]]}
          badge="8890.0"
          xLabels={[["10:45 PM", "8 Oct"], ["11:25 PM", "9 Oct"]]}
        />
        <p className="subhead">Trade index options</p>
        <ToolPills />
      </Block>

      <Block title="Commodity Scalper">
        <CardGrid items={commodityScalper} />
      </Block>

      <Block
        title="Commodity Categories"
        action={<button className="text-link">View All</button>}
      >
        <CategoryGrid items={commodityCategories} />
      </Block>

      <Block title="Top Traded Commodity Futures">
        <CommodityRows rows={topTradedFutures} />
      </Block>

      <Block title="Commodity Option Chain">
        <CardGrid items={commodityOptionChain} />
      </Block>
    </main>
  );
}
