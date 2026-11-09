# Meta Pixel and static page update

- Added pixel 1039651225691142 alongside the existing pixel 4054827501430067. The initial document PageView fires for both; React Router path/query changes fire PageView for the new pixel only. Existing generic Meta event calls continue to target both initialized pixels.
- About, Contact, Terms, Shops and Order Cancelled are now eagerly bundled so navigation to those static pages does not wait for a separate page chunk. Removed the 100 ms reveal delay on Order Cancelled. Dynamic product, cart and account pages remain asynchronous; network/initial bundle and external resources can still take time.
- The supplied archive had no src/assets directory. Missing assets were restored from the existing Drive archive franko_web-meta-pixel-instant-render.zip.
- Production build completed. Restore environment values from your existing .env before building; the original .env is excluded from this archive. Deploy the entire built dist directory, and ensure server fallback routes serve index.html.
- Verify in Meta Events Manager and check GTM for any duplicate Meta tags before deployment. No live events or browser performance measurements were verified. Existing GTM configuration was retained.
