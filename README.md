# Airtel Rewards Quest (prototype v1)

**▶ Play it here: https://ekcuttingchaidesign.github.io/rewards-game/**

Two game concepts on the same link. Switch with the tab bar at the bottom of the screen, or open one directly with these links:
- **Platformer**: https://ekcuttingchaidesign.github.io/rewards-game/?g=platformer
- **Claw machine**: https://ekcuttingchaidesign.github.io/rewards-game/?g=claw

Mini games for the top of the Airtel Rewards page. In both you collect the user's 3 rewards and there's no way to fail.

- **Platformer:** the hero runs through a short level. Bump the block, stomp the pipe bubble, then bounce off the mushroom.
- **Claw machine:** the claw patrols back and forth. Line it up over a mystery capsule and tap to drop it straight down (or drag to aim and release). The dotted aim line turns gold when you're on target. A near miss catches the capsule's edge and it slips out ("SO CLOSE!"). A clean miss comes up empty but gives +2 coins. Each miss widens the grab window and slows the claw, and after 2 misses in a row auto-aim switches on, so nobody gets stuck.

 Every sound is synthesised in the browser and the hero is drawn in code (`js/hero.js`).

- Open on a phone, then Share › Add to Home Screen for full-screen.
- [`?p=1`](https://ekcuttingchaidesign.github.io/rewards-game/?p=1) · [`?p=2`](https://ekcuttingchaidesign.github.io/rewards-game/?p=2) · [`?p=3`](https://ekcuttingchaidesign.github.io/rewards-game/?p=3) (add `&g=claw` for the claw machine) switch which 3 rewards the user gets (Google One/Adobe/Netflix, JioHotstar/Adobe/Google One, Netflix/JioHotstar/Adobe).
- Presenter controls: long-press the coin pill on a phone, or press **P** on desktop. Reset, profile and sound are all in there.
- Plain HTML/CSS/JS with GSAP and no build step. Serve the folder with any static server.
- Code: `js/shell.js` is shared (tray, reveal, finale, rewards list, controls); `js/platformer.js` and `js/claw.js` are the games.
