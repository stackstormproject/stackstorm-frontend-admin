import { http } from '../lib/http';

/**
 * The shop's three home page hero banners (#204). Each slot (1, 2 or 3) holds at
 * most one banner; GET /admin/banners always returns all three, filled or not.
 */

/** GET /admin/banners -> [{ id, slot, title, subtitle, image_url, button_text, button_link, is_active }] */
export const listBanners = () => http.get('/admin/banners');

/** PUT /admin/banners/:slot - creates or replaces the banner in that slot. */
export const saveBanner = (slot, fields) => http.put(`/admin/banners/${slot}`, fields);

/** DELETE /admin/banners/:slot - clears the slot back to empty. */
export const clearBanner = (slot) => http.delete(`/admin/banners/${slot}`);
