import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../renderApp';
import * as bannersApi from '../../api/banners';
import * as productsApi from '../../api/products';

vi.mock('../../api/banners');
vi.mock('../../api/products');

// Refs #204: the three home page hero banners, managed from admin.
const photo = (name = 'banner.jpg', type = 'image/jpeg', size = 1000) =>
  new File([new Uint8Array(size)], name, { type });

describe('Banners page', () => {
  it('should show a filled slot and an empty one', async () => {
    bannersApi.listBanners.mockResolvedValue([
      {
        id: 1,
        slot: 1,
        title: 'Batik season',
        subtitle: 'New waxed prints',
        image_url: '/m/banner1.jpg',
        button_text: 'Shop now',
        button_link: '/shop',
        is_active: true,
      },
    ]);
    renderApp('/banners');

    const slot1 = (await screen.findByText('Batik season')).closest('section');
    expect(within(slot1).getByText(/Shown on the home page/)).toBeInTheDocument();
    expect(within(slot1).getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    const slot2 = screen.getByLabelText('Banner slot 2');
    expect(
      within(slot2).getByText('Empty — the default artwork shows instead.')
    ).toBeInTheDocument();
    expect(within(slot2).getByRole('button', { name: 'Add banner' })).toBeInTheDocument();
  });

  it('should add a banner to an empty slot with an uploaded photo', async () => {
    const user = userEvent.setup();
    bannersApi.listBanners.mockResolvedValue([]);
    bannersApi.saveBanner.mockResolvedValue({});
    productsApi.uploadImages.mockResolvedValue({ urls: ['/m/banner2.jpg'] });
    renderApp('/banners');

    const slot2 = await screen.findByLabelText('Banner slot 2');
    await user.click(within(slot2).getByRole('button', { name: 'Add banner' }));

    await user.type(screen.getByLabelText('Title'), 'Festival sets');
    fireEvent.change(screen.getByLabelText('Upload photo'), { target: { files: [photo()] } });
    await waitFor(() => expect(productsApi.uploadImages).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Save banner' }));

    await waitFor(() =>
      expect(bannersApi.saveBanner).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ title: 'Festival sets', image_url: '/m/banner2.jpg' })
      )
    );
  });

  it('should refuse a title that is too short and a banner with no photo', async () => {
    const user = userEvent.setup();
    bannersApi.listBanners.mockResolvedValue([]);
    renderApp('/banners');

    const slot1 = await screen.findByLabelText('Banner slot 1');
    await user.click(within(slot1).getByRole('button', { name: 'Add banner' }));
    await user.type(screen.getByLabelText('Title'), 'X');
    await user.click(screen.getByRole('button', { name: 'Save banner' }));

    expect(await screen.findByText('Enter a title of 2-120 characters.')).toBeInTheDocument();
    expect(screen.getByText('Upload a photo for this banner.')).toBeInTheDocument();
    expect(bannersApi.saveBanner).not.toHaveBeenCalled();
  });

  it('should refuse a button label without a link', async () => {
    const user = userEvent.setup();
    bannersApi.listBanners.mockResolvedValue([
      {
        id: 1,
        slot: 1,
        title: 'Batik season',
        subtitle: '',
        image_url: '/m/banner1.jpg',
        button_text: '',
        button_link: '',
        is_active: true,
      },
    ]);
    renderApp('/banners');

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Button label (optional)'), 'Shop now');
    await user.click(screen.getByRole('button', { name: 'Save banner' }));

    expect(
      await screen.findByText('A button needs both a label and a link, or neither.')
    ).toBeInTheDocument();
    expect(bannersApi.saveBanner).not.toHaveBeenCalled();
  });

  it('should clear a banner back to empty', async () => {
    const user = userEvent.setup();
    bannersApi.listBanners.mockResolvedValue([
      {
        id: 1,
        slot: 1,
        title: 'Batik season',
        subtitle: '',
        image_url: '/m/banner1.jpg',
        button_text: '',
        button_link: '',
        is_active: true,
      },
    ]);
    bannersApi.clearBanner.mockResolvedValue({});
    renderApp('/banners');

    await user.click(await screen.findByRole('button', { name: 'Clear banner 1' }));
    await user.click(screen.getByRole('button', { name: 'Clear banner' }));

    await waitFor(() => expect(bannersApi.clearBanner).toHaveBeenCalledWith(1));
  });
});
