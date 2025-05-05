# Prometheus Swarm

## Running Tests with Coverage

To run tests with coverage:

1. Install test dependencies:
```bash
pip install .[test]
```

2. Run tests:
```bash
./run_tests.sh
```

Test reports will be generated in the `test-reports` directory:
- HTML Coverage Report: `test-reports/coverage/index.html`
- XML Coverage Report: `test-reports/coverage.xml`
- Test Report: `test-reports/test_report.html`