
import React from 'react';
import { Weather, Season } from '../types';
import { Sun, CloudRain, Droplets, Snowflake } from 'lucide-react';

interface WeatherEffectsProps {
  weather: Weather;
  season: Season;
}

export const WeatherEffects: React.FC<WeatherEffectsProps> = ({ weather, season }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Weather particles */}
      {weather === 'rainy' && (
        <div className="rain-container absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="rain-drop absolute bg-blue-400/40"
              style={{
                left: `${(i * 7) % 100}%`,
                animation: 'rain linear infinite',
                animationDelay: `${(i * 0.1) % 2}s`,
                animationDuration: `${0.5 + (i % 3) * 0.3}s`,
                width: '2px',
                height: '20px',
                borderRadius: '1px',
              }}
            />
          ))}
        </div>
      )}
      
      {weather === 'drought' && (
        <div className="absolute inset-0 bg-yellow-900/10 animate-pulse" />
      )}

      {/* Season ambiance */}
      {season === 'winter' && (
        <div className="snow-container absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="snowflake absolute text-white/60"
              style={{
                left: `${(i * 13) % 100}%`,
                animation: 'snow linear infinite',
                animationDelay: `${(i * 0.2) % 3}s`,
                animationDuration: `${3 + (i % 4)}s`,
                fontSize: '12px',
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

