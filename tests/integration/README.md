# Integration Tests

Integration tests verify that multiple MedOrbits modules work together.

Use an isolated database and controlled dependencies. Verify transaction boundaries, authorization, error propagation, and cleanup. External email and payment systems should use mocks or provider sandbox environments. Never point integration tests at production.
