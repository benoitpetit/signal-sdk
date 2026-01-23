// Global Jest setup to handle cleanup
afterAll(() => {
    // Give a moment for any pending timers to complete
    return new Promise((resolve) => {
        setImmediate(() => {
            resolve();
        });
    });
});
