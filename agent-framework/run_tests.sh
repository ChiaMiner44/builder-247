#!/bin/bash
set -e

# Create test reports directory if it doesn't exist
mkdir -p test-reports/coverage

# Run tests with coverage
pytest --cov=prometheus_swarm \
       --cov-report=html:test-reports/coverage \
       --cov-report=xml:test-reports/coverage.xml \
       --cov-report=term \
       --html=test-reports/test_report.html \
       tests/