# Airtel Rewards Quest (prototype v1)

A one-tap mini game for the top of the Airtel Rewards page. The hero runs through a short level and collects the user's 3 rewards: bump the block, stomp the pipe bubble, then bounce off the mushroom. There's no way to fail. Every sound is synthesised in the browser and the hero is drawn in code (`js/hero.js`).

- Open on a phone, then Share › Add to Home Screen for full-screen.
- `?p=1|2|3` switches which 3 rewards the user gets (Google One/Adobe/Netflix, JioHotstar/Adobe/Google One, Netflix/JioHotstar/Adobe).
- Presenter controls: long-press the coin pill on a phone, or press **P** on desktop. Reset, profile and sound are all in there.
- Plain HTML/CSS/JS with GSAP and no build step. Serve the folder with any static server.
