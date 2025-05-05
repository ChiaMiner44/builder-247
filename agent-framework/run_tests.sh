#!/bin/bash
set -e

# Ensure test reports directory exists
mkdir -p test-reports/coverage

# Run tests with comprehensive coverage and reporting
pytest \
    -v \
    --cov=prometheus_swarm \
    --cov-report=term-missing \
    --cov-report=html:test-reports/coverage \
    --cov-report=xml:test-reports/coverage.xml \
    --cov-config=.coveragerc \
    --html=test-reports/report.html \
    tests/

# Display coverage report
coverage report --fail-under=80