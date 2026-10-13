import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ModelFitResult } from '../../types';
import {
  Lightbulb, Sparkles, TrendingUp, CheckCircle2,
  AlertCircle, Activity, Compass, Cpu, Layers
} from 'lucide-react';

interface ModelFittedExplanationProps {
  modelType: string;
  fitResult: ModelFitResult;
  parameters: Record<string, any>;
  forecastHorizon: number;
  confidenceLevel: number;
}

export const ModelFittedExplanation: React.FC<ModelFittedExplanationProps> = ({
  modelType,
  fitResult,
  parameters,
  forecastHorizon,
  confidenceLevel,
}) => {
  const { isDark } = useTheme();
  const params = fitResult.param_estimates || {};
  const metrics = fitResult.metrics || {};

  const renderContent = () => {
    switch (modelType) {
      case 'naive':
        return {
          title: 'Naive Random Walk Benchmark — Statistical Interpretation',
          badge: 'Baseline Benchmark',
          formula: `Ŷ_{T+h} = Y_T = ${fitResult.actual[fitResult.actual.length - 1]?.toFixed(2)}`,
          summary: 'The Naive Random Walk carries the most recent empirical observation forward unconditionally across all forecast horizons. It assumes the best predictor of tomorrow is today’s value.',
          sections: [
            {
              title: 'Why It Produces a Flat Projection',
              text: 'Because random walk processes have zero deterministic drift, the expected future value E[Y_{T+h} | Y_T] equals the terminal value Y_T. The forward forecast is an exact horizontal line.'
            },
            {
              title: 'Connection to First Differencing',
              text: 'In a Naive model, each one-step in-sample residual e_t = Y_t - Y_{t-1} is simply the first difference of the series. If residuals appear random, the series resembles a pure random walk.'
            },
            {
              title: 'Critical Role in ATSA Model Evaluation (MASE)',
              text: 'The Naive model defines the benchmark denominator for Mean Absolute Scaled Error (MASE = 1.0). Any complex statistical model (e.g. ARIMA, Holt-Winters) must achieve MASE < 1.0 to prove it provides genuine statistical value over simple inertia.'
            }
          ],
          takeaway: `This Naive baseline achieved RMSE of ${metrics.rmse?.toFixed(3) ?? '—'}. When testing more advanced models in the Comparison Lab, verify that their MASE stays below 1.0.`
        };

      case 'linear_trend': {
        const slope = typeof params['trend'] === 'number' ? params['trend'] : (typeof params['x1'] === 'number' ? params['x1'] : 0);
        const constVal = typeof params['const'] === 'number' ? params['const'] : 0;
        return {
          title: 'Deterministic Linear Trend — Regression Diagnostics',
          badge: 'OLS Regression',
          formula: `Y_t = ${constVal ? constVal.toFixed(2) : 'β₀'} + (${slope ? slope.toFixed(4) : 'β₁'}) · t + ε_t`,
          summary: `The model estimates a rigid global linear trend using Ordinary Least Squares (OLS). It projects a constant secular drift of ${slope ? slope.toFixed(4) : 'β₁'} units per time step.`,
          sections: [
            {
              title: 'Deterministic vs. Stochastic Trend',
              text: 'This regression assumes the trend is deterministic (rigid and fixed). If the series undergoes permanent level shifts from shocks, a deterministic trend can produce persistent forecasting errors compared to stochastic differencing (ARIMA).'
            },
            {
              title: 'Slope Direction & Velocity',
              text: slope > 0
                ? `Positive secular drift: The target series grows by approximately ${Math.abs(slope).toFixed(4)} per unit time on average.`
                : slope < 0
                ? `Negative secular drift: The target series contracts by approximately ${Math.abs(slope).toFixed(4)} per unit time on average.`
                : 'Near-zero drift: The fitted slope indicates a flat horizontal trajectory.'
            },
            {
              title: 'Prediction Funnel Expansion',
              text: `Analytical confidence intervals widen over the ${forecastHorizon}-step horizon because uncertainty in both slope (β₁) and intercept (β₀) accumulates as time index t moves further from historical center.`
            }
          ],
          takeaway: 'Deterministic trend is best suited for series where the long-term drift is driven by physical or structural constants. If residuals exhibit autocorrelation, consider differencing via ARIMA.'
        };
      }

      case 'ses': {
        const alpha = typeof params['alpha'] === 'number' ? params['alpha'] : (typeof params['smoothing_level'] === 'number' ? params['smoothing_level'] : 0.5);
        return {
          title: 'Simple Exponential Smoothing (SES) — State Adaptation Analysis',
          badge: 'Exponential Smoothing',
          formula: `L_t = ${alpha ? alpha.toFixed(3) : 'α'} Y_t + (1 - ${alpha ? alpha.toFixed(3) : 'α'}) L_{t-1},  Ŷ_{T+h} = L_T`,
          summary: `Simple Exponential Smoothing models localized level without secular trend or seasonality. The estimated smoothing weight is α = ${alpha ? alpha.toFixed(3) : 'auto'}.`,
          sections: [
            {
              title: `Memory Weight (α = ${alpha ? alpha.toFixed(3) : '—'})`,
              text: alpha > 0.6
                ? `High adaptation rate (α = ${alpha.toFixed(3)}): The model places heavy weight on the latest observations and responds rapidly to recent shifts, discounting older history quickly.`
                : alpha < 0.3
                ? `Conservative smoothing (α = ${alpha.toFixed(3)}): The model averages over a wide historical window, filtering out short-term fluctuations and maintaining high stability.`
                : `Moderate adaptation (α = ${alpha.toFixed(3)}): Balanced trade-off between shock responsiveness and noise filtration.`
            },
            {
              title: 'Horizontal Forward Trajectory',
              text: `SES produces a constant forward forecast (Ŷ_{T+h} = L_T) equal to the terminal smoothed level across all ${forecastHorizon} steps, as it assumes no directional drift or seasonality.`
            },
            {
              title: 'When to Upgrade',
              text: 'If your series exhibits a clear upward or downward angle, SES will lag behind actual values. Upgrade to Holt’s Linear Trend to capture trajectory slope.'
            }
          ],
          takeaway: `The terminal smoothed level is projected flat forward. With α = ${alpha ? alpha.toFixed(3) : 'auto'}, recent shocks have a ${(alpha * 100).toFixed(0)}% initial impact on the baseline estimate.`
        };
      }

      case 'holt': {
        const alpha = typeof params['alpha'] === 'number' ? params['alpha'] : (typeof params['smoothing_level'] === 'number' ? params['smoothing_level'] : 0.5);
        const beta = typeof params['beta'] === 'number' ? params['beta'] : (typeof params['smoothing_trend'] === 'number' ? params['smoothing_trend'] : 0.2);
        return {
          title: "Holt's Linear Trend — Level & Momentum Evaluation",
          badge: 'Two-Parameter Smoothing',
          formula: `Ŷ_{T+h} = L_T + h · b_T  (α = ${alpha ? alpha.toFixed(3) : 'auto'}, β = ${beta ? beta.toFixed(3) : 'auto'})`,
          summary: `Holt’s method decouples level adaptation (α) from trend slope adaptation (β). Unlike rigid OLS regression, Holt's slope b_t updates dynamically as momentum evolves.`,
          sections: [
            {
              title: `Level Smoothing (α = ${alpha ? alpha.toFixed(3) : '—'}) & Slope Smoothing (β = ${beta ? beta.toFixed(3) : '—'})`,
              text: `Level adapts at rate α = ${alpha ? alpha.toFixed(3) : '—'}, while slope adjusts at rate β = ${beta ? beta.toFixed(3) : '—'}. A smaller β produces a stable, conservative trajectory, while larger β quickly pivots with recent momentum shifts.`
            },
            {
              title: 'Forward Vector Projection',
              text: `The out-of-sample forecast projects forward linearly along the terminal slope vector b_T for ${forecastHorizon} steps. Unlike SES, the projection is angled rather than horizontal.`
            },
            {
              title: 'Trend Extrapolation Precaution',
              text: 'Holt assumes the current momentum continues unabated. If the trend is likely to plateau or saturate in the real world, damped trend smoothing is recommended.'
            }
          ],
          takeaway: 'Holt’s method captures local momentum effectively. Verify that the slope angle aligns with the series’ medium-term trajectory.'
        };
      }

      case 'holt_winters': {
        const period = parameters['period'] || 12;
        const trendType = parameters['trend'] || 'additive';
        const seasonalType = parameters['seasonal'] || 'additive';
        return {
          title: 'Holt-Winters Triple Smoothing — Seasonal State Decomposition',
          badge: 'Seasonal State-Space',
          formula: `Ŷ_{T+h} = (L_T + h b_T) ${seasonalType === 'mul' ? '·' : '+'} S_{T+h-s(k+1)}  (Period s = ${period})`,
          summary: `Holt-Winters captures Level (L_t), Trend (b_t), and cyclic Seasonality (S_t) simultaneously across recurring period s = ${period} using ${seasonalType} seasonal modulation.`,
          sections: [
            {
              title: `Seasonal Architecture (s = ${period}, ${seasonalType.toUpperCase()})`,
              text: seasonalType === 'mul'
                ? 'Multiplicative seasonality scales cyclical oscillations proportionally to the series level: peaks grow higher when the overall trend is high.'
                : 'Additive seasonality maintains fixed-amplitude oscillations regardless of whether the trend rises or falls.'
            },
            {
              title: 'Waveform Replay into Horizon',
              text: `The model replays the learned ${period}-step seasonal profile across the ${forecastHorizon}-step forward horizon, reproducing peaks, valleys, and turning points.`
            },
            {
              title: 'Period Calibration Check',
              text: `Ensure the period s = ${period} precisely matches the underlying frequency (e.g. 7 for daily weekly cycles, 12 for monthly annual cycles).`
            }
          ],
          takeaway: `The forecast maintains cyclical rhythm with period ${period}. Examine the in-sample fitted curve to verify that seasonal turning points are captured without phase delay.`
        };
      }

      case 'ar': {
        const p = parameters['p'] || 1;
        const phi = params['ar.L1'] || params['phi_1'] || (Object.entries(params).find(([k]) => k.includes('ar'))?.[1] ?? 0.5);
        return {
          title: `Autoregressive Model AR(${p}) — Lag Persistence & Memory Dynamics`,
          badge: `AR(${p}) Process`,
          formula: `Y_t = c + ∑_{i=1}^${p} φ_i Y_{t-i} + ε_t`,
          summary: `The AR(${p}) model conditions the current state on its own preceding ${p} lag observations. Shocks persist through autoregressive feedback.`,
          sections: [
            {
              title: `Lag Memory & Persistence (Order p = ${p})`,
              text: typeof phi === 'number'
                ? `Leading autoregressive coefficient φ₁ = ${phi.toFixed(3)}. Higher positive values indicate strong momentum/inertia; negative values indicate alternating oscillations.`
                : `Model conditioned on ${p} historical lags.`
            },
            {
              title: 'Mean Reversion Property',
              text: 'Because stationary AR processes are mean-reverting, forward forecasts gradually decay geometrically back towards the unconditional series mean μ as horizon h increases.'
            },
            {
              title: 'Stationarity Condition',
              text: 'Stationarity requires that all roots of the characteristic polynomial lie outside the complex unit circle (for AR(1), |φ₁| < 1). If φ ≈ 1.0, the process acts like a random walk.'
            }
          ],
          takeaway: `AR(${p}) models capture serial inertia. Over long horizons, the forecast naturally relaxes toward the long-term unconditional mean.`
        };
      }

      case 'ma': {
        const q = parameters['q'] || 1;
        const theta = params['ma.L1'] || params['theta_1'] || (Object.entries(params).find(([k]) => k.includes('ma'))?.[1] ?? 0.4);
        return {
          title: `Moving Average Model MA(${q}) — Finite Innovation Absorption`,
          badge: `MA(${q}) Process`,
          formula: `Y_t = μ + ε_t + ∑_{j=1}^${q} θ_j ε_{t-j}`,
          summary: `The MA(${q}) model expresses the series as a linear combination of current and past white-noise forecast errors (innovations), rather than past raw values.`,
          sections: [
            {
              title: `Finite Shock Memory (q = ${q} steps)`,
              text: `Unlike AR processes which have infinite geometric memory, an MA(${q}) process has strictly finite memory: shocks older than ${q} steps have exactly zero impact on the present.`
            },
            {
              title: `Cutoff at Horizon h > ${q}`,
              text: `For forecast horizons h > ${q}, all future shocks are unobservable expectations (E[ε_{T+h}] = 0). Consequently, the forecast flatlines exactly at the process mean μ after step ${q}.`
            },
            {
              title: 'Not a Rolling Filter',
              text: 'In ATSA terminology, a Moving Average model is a stochastic shock-integration process, distinct from a moving average smoothing filter.'
            }
          ],
          takeaway: `After ${q} transition steps, MA(${q}) forecasts strictly converge to the unconditional mean. It is ideal for short-lived shock dynamics.`
        };
      }

      case 'arma': {
        const p = parameters['p'] || 1;
        const q = parameters['q'] || 1;
        return {
          title: `ARMA(${p}, ${q}) — Dual Momentum & Shock Architecture`,
          badge: `ARMA(${p}, ${q})`,
          formula: `Φ(B) Y_t = c + Θ(B) ε_t`,
          summary: `ARMA(${p}, ${q}) integrates autoregressive momentum AR(${p}) with transitory shock absorption MA(${q}) for covariance-stationary processes.`,
          sections: [
            {
              title: 'Dual Stochastic Mechanisms',
              text: `The AR(${p}) component provides continuous autoregressive memory, while the MA(${q}) component absorbs short-term white noise innovations efficiently.`
            },
            {
              title: 'Stationarity Requirement',
              text: 'ARMA assumes the series is weakly stationary (constant mean, constant variance, autocovariance dependent only on lag distance). ADF test must confirm stationarity.'
            },
            {
              title: 'Information Criteria (AIC/BIC)',
              text: `Fitted model achieved AIC = ${metrics.aic?.toFixed(2) ?? '—'}. Lower AIC indicates an optimal balance between predictive accuracy and model parsimony.`
            }
          ],
          takeaway: `ARMA(${p}, ${q}) provides high parameter efficiency. Inspect the residual ACF in Tab 2 to verify that errors are uncorrelated white noise.`
        };
      }

      case 'arima': {
        const p = parameters['p'] ?? 1;
        const d = parameters['d'] ?? 1;
        const q = parameters['q'] ?? 1;
        return {
          title: `ARIMA(${p}, ${d}, ${q}) — Integrated Stationarized Architecture`,
          badge: `ARIMA(${p}, ${d}, ${q})`,
          formula: `(1 - B)^${d} Φ(B) Y_t = c + Θ(B) ε_t`,
          summary: `ARIMA applies order-d differencing (d = ${d}) to remove non-stationary stochastic trend, fits an ARMA(${p}, ${q}) process on the differenced series, and integrates forecasts back to original scale.`,
          sections: [
            {
              title: `Differencing Order (d = ${d})`,
              text: d === 1
                ? 'First-order differencing ΔY_t = Y_t - Y_{t-1} successfully eliminates stochastic linear drift and unit roots, stabilizing the process mean.'
                : d === 2
                ? 'Second-order differencing Δ²Y_t eliminates quadratic trends and accelerating growth trajectories.'
                : 'No differencing applied (d=0); series modeled in raw levels.'
            },
            {
              title: 'Adaptive Stochastic Trend',
              text: 'Unlike rigid OLS regression, ARIMA’s trend is stochastic: every new shock permanently shifts the expected baseline forward, making it robust against structural breaks.'
            },
            {
              title: 'Expanding Prediction Funnel',
              text: `Because integrated unit-root processes accumulate random shock variance indefinitely, prediction interval bounds widen noticeably over the ${forecastHorizon}-step forward horizon.`
            }
          ],
          takeaway: `ARIMA(${p}, ${d}, ${q}) handles non-stationary series with wandering baselines. Review the residual diagnostics in Tab 2 to confirm that all serial correlation was removed.`
        };
      }

      case 'sarima': {
        const p = parameters['p'] ?? 1;
        const d = parameters['d'] ?? 0;
        const q = parameters['q'] ?? 1;
        const P = parameters['P'] ?? 1;
        const D = parameters['D'] ?? 0;
        const Q = parameters['Q'] ?? 1;
        const s = parameters['s'] ?? 12;
        return {
          title: `SARIMA(${p},${d},${q})(${P},${D},${Q})[${s}] — Multiplicative Seasonal Architecture`,
          badge: `SARIMA[${s}]`,
          formula: `Φ_p(B) Φ̃_P(B^${s}) (1 - B)^${d} (1 - B^${s})^${D} Y_t = Θ_q(B) Θ̃_Q(B^${s}) ε_t`,
          summary: `Seasonal Multiplicative ARIMA models high-frequency localized transitions alongside seasonal recurrence at interval s = ${s}.`,
          sections: [
            {
              title: `Seasonal Multiplicative Polynomials [Period s = ${s}]`,
              text: `Seasonal AR order P = ${P} and Seasonal MA order Q = ${Q} condition expectations directly on cyclical lags (t - ${s}, t - ${2 * s}). This projects repeating cyclical waves into the future.`
            },
            {
              title: `Seasonal Differencing (D = ${D})`,
              text: D > 0
                ? `Order D = ${D} seasonal differencing (Y_t - Y_{t-${s}}) eliminates seasonal non-stationarity, stabilizing recurring annual/weekly cyclical amplitudes.`
                : `No seasonal differencing (D=0); seasonal dynamics captured through stationary seasonal AR/MA polynomials.`
            },
            {
              title: 'Waveform Forward Horizon',
              text: `The ${forecastHorizon}-step forecast does not collapse to a straight line; it reproduces the seasonal rise-and-fall cycle across multiple future calendar periods.`
            }
          ],
          takeaway: `SARIMA is the premier classical model for seasonal data. Its projection incorporates both short-term momentum and long-range seasonal periodicity [s=${s}].`
        };
      }

      default:
        return {
          title: 'Fitted Time Series Model Analysis',
          badge: 'ATSA Engine',
          formula: 'Y_t = f(Y_{t-1}, ..., ε_t)',
          summary: 'Statistical parameter estimation completed successfully using statsmodels exact likelihood.',
          sections: [
            {
              title: 'Parameter Estimates',
              text: 'Review the estimated coefficients in Tab 3 to examine the magnitude and significance of individual terms.'
            }
          ],
          takeaway: 'Examine residual diagnostics in Tab 2 to confirm that errors are uncorrelated white noise.'
        };
    }
  };

  const explanation = renderContent();

  return (
    <div className={`mt-5 rounded-2xl border p-5 transition ${
      isDark
        ? 'bg-slate-900/60 border-slate-800 shadow-md'
        : 'bg-white border-slate-200/90 shadow-xs'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-blue-500/20 text-cyan-300' : 'bg-blue-50 text-blue-700'
          }`}>
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                isDark ? 'bg-blue-500/10 text-cyan-300 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {explanation.badge}
              </span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {explanation.title}
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Comprehensive mathematical interpretation of the fitted model & parameter estimates
            </p>
          </div>
        </div>

        {/* Model RMSE & AIC Quick Chips */}
        <div className="flex items-center gap-2 text-[11px] font-mono self-start sm:self-auto">
          {metrics.rmse !== undefined && metrics.rmse !== null && (
            <span className={`px-2 py-1 rounded-lg border ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              RMSE: <span className="font-bold text-blue-600 dark:text-cyan-400">{metrics.rmse.toFixed(3)}</span>
            </span>
          )}
          {metrics.aic !== undefined && metrics.aic !== null && (
            <span className={`px-2 py-1 rounded-lg border ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              AIC: <span className="font-bold text-violet-600 dark:text-violet-400">{metrics.aic.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Formula & Summary */}
      <div className="mt-4 space-y-3">
        <div className={`p-3 rounded-xl border font-mono text-xs overflow-x-auto flex items-center gap-2.5 ${
          isDark ? 'bg-slate-950/60 border-slate-800 text-cyan-300' : 'bg-slate-50 border-slate-200 text-blue-700'
        }`}>
          <span className="font-sans text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] shrink-0 select-none">
            Estimated Specification:
          </span>
          <span className="font-bold">{explanation.formula}</span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {explanation.summary}
        </p>

        {/* 3 Key Educational Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {explanation.sections.map((sec, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-950/40 border-slate-800/80'
                  : 'bg-slate-50/70 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-cyan-500' : 'bg-amber-500'
                }`}></span>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  {sec.title}
                </h4>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}
        </div>

        {/* Actionable Takeaway Banner */}
        <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
          isDark
            ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          }`} />
          <div>
            <span className={`font-bold mr-1.5 ${
              isDark ? 'text-emerald-300' : 'text-emerald-800'
            }`}>
              Fitted Model Takeaway:
            </span>
            <span>{explanation.takeaway}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
