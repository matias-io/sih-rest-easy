// Rest Easy needs a webcam, a keyboard and a desktop-sized screen, so phones and tablets get the
// landing page but not the run. Touch laptops still count as computers: they have a fine pointer.
export function isPhoneOrTablet(nav = navigator, mq = (q) => matchMedia(q).matches) {
  if (nav.userAgentData?.mobile) return true;
  const ua = nav.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && nav.maxTouchPoints > 1) return true;   // iPadOS Safari asks for the desktop site
  return mq('(pointer: coarse)') && !mq('(any-pointer: fine)');
}
