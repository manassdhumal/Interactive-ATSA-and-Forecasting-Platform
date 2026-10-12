"""
Chronos ATSA Platform Backend Package
"""
import sys
import types

# Compatibility shim: Windows 11 Smart App Control / WDAC policy can block unsigned _arma_innovations.pyd.
# ARIMA and SARIMAX in statsmodels use StateSpace/MLE (Kalman filter) and do not require this Cython module.
if "statsmodels.tsa.innovations._arma_innovations" not in sys.modules:
    try:
        from statsmodels.tsa.innovations import _arma_innovations  # type: ignore # noqa: F401
    except (ImportError, OSError):
        mock_innovations = types.ModuleType("statsmodels.tsa.innovations._arma_innovations")
        sys.modules["statsmodels.tsa.innovations._arma_innovations"] = mock_innovations
