import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const YAHOO_WEATHER_API_BASE = "https://map.yahooapis.jp/weather/V1/place";
const USER_AGENT = "weather-app/1.0";

const config = getServerConfig();
const YAHOO_APP_ID = config.yahoo_app_id;

const server = new McpServer({
  name: "get-rainfall",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

function getServerConfig(): { yahoo_app_id: string } {
  const argv = yargs(hideBin(process.argv))
    .option("yahoo-app-id", {
      type: "string",
      describe: "Yahoo API application ID",
      demandOption: true,
    })
    .help()
    .parseSync();

  return {
    yahoo_app_id: argv["yahoo-app-id"],
  };
}

async function fetchWeatherV1Place<T>(
  coordinates: string,
  options: Record<string, string> = {}
): Promise<T | null> {
  const params = new URLSearchParams({
    appid: YAHOO_APP_ID,
    coordinates,
    output: "json",
    ...options,
  });

  const url = `${YAHOO_WEATHER_API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(response);

    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Yahoo Weather API request:", error);
    return null;
  }
}

interface WeatherData {
  Feature?: Array<{
    Name?: string;
    Geometry?: {
      Type?: string;
      Coordinates?: string;
    };
    Property?: {
      WeatherAreaCode?: string;
      WeatherList?: {
        Weather?: Array<{
          Type?: string;
          Date?: string;
          Rainfall?: number;
        }>;
      };
    };
  }>;
}

server.tool(
  "get-rainfall",
  "Get current and forecasted rainfall for a location in Japan",
  {
    longitude: z
      .number()
      .min(122)
      .max(154)
      .describe("Longitude of the location in Japan"),
    latitude: z
      .number()
      .min(20)
      .max(46)
      .describe("Latitude of the location in Japan"),
  },
  async ({ longitude, latitude }) => {
    const coordinates = `${longitude.toFixed(5)},${latitude.toFixed(5)}`;
    const weatherData = await fetchWeatherV1Place<WeatherData>(coordinates);

    if (
      !weatherData ||
      !weatherData.Feature ||
      weatherData.Feature.length === 0
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve weather data for coordinates: ${longitude}, ${latitude}`,
          },
        ],
      };
    }

    const feature = weatherData.Feature[0];
    const weatherList = feature.Property?.WeatherList?.Weather || [];

    if (weatherList.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No weather data available for ${longitude}, ${latitude}`,
          },
        ],
      };
    }

    const formattedWeatherData = weatherList.map((weather) => {
      const date = weather.Date ? formatDate(weather.Date) : "Unknown";
      const type = weather.Type === "observation" ? "観測値" : "予測値";
      const rainfall =
        weather.Rainfall !== undefined ? weather.Rainfall : "Unknown";

      return `${date} (${type}): 降水強度 ${rainfall} mm/h`;
    });

    const locationName = feature.Name || `座標(${longitude}, ${latitude})`;
    const weatherText = `${locationName}の降水情報:\n\n${formattedWeatherData.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: weatherText,
        },
      ],
    };
  }
);

server.tool(
  "get-rainfall-past",
  "Get past rainfall data for a location in Japan",
  {
    longitude: z
      .number()
      .min(122)
      .max(154)
      .describe("Longitude of the location in Japan"),
    latitude: z
      .number()
      .min(20)
      .max(46)
      .describe("Latitude of the location in Japan"),
    past: z.number().min(1).max(2).describe("Hours of past data (1 or 2)"),
  },
  async ({ longitude, latitude, past }) => {
    const coordinates = `${longitude.toFixed(5)},${latitude.toFixed(5)}`;
    const weatherData = await fetchWeatherV1Place<WeatherData>(coordinates, {
      past: past.toString(),
    });

    if (
      !weatherData ||
      !weatherData.Feature ||
      weatherData.Feature.length === 0
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve past weather data for coordinates: ${longitude}, ${latitude}`,
          },
        ],
      };
    }

    const feature = weatherData.Feature[0];
    const weatherList = feature.Property?.WeatherList?.Weather || [];

    if (weatherList.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No past weather data available for ${longitude}, ${latitude}`,
          },
        ],
      };
    }

    const pastWeatherData = weatherList
      .filter((weather) => weather.Type === "observation")
      .map((weather) => {
        const date = weather.Date ? formatDate(weather.Date) : "Unknown";
        const rainfall =
          weather.Rainfall !== undefined ? weather.Rainfall : "Unknown";

        return `${date}: 降水強度 ${rainfall} mm/h`;
      });

    const locationName = feature.Name || `座標(${longitude}, ${latitude})`;
    const weatherText = `${locationName}の過去${past}時間の降水情報:\n\n${pastWeatherData.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: weatherText,
        },
      ],
    };
  }
);

function formatDate(dateString: string): string {
  if (dateString.length !== 12) return dateString;

  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  const hour = dateString.substring(8, 10);
  const minute = dateString.substring(10, 12);

  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Yahoo Weather JP MCP Server running on stdio (API Key: ${YAHOO_APP_ID.substring(
      0,
      4
    )}...)`
  );
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
