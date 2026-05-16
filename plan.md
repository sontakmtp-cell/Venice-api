# Ke hoach tao trang rieng cho chinh sua anh

Muc tieu: bo sung tinh nang chinh sua anh bang Venice API tren mot trang rieng, tach biet voi luong tao video hien tai de tranh lan lon thao tac va trang thai. Model su dung mac dinh: `grok-imagine-quality-edit`.

## Huong trien khai

1. Giu nguyen trang tao video hien tai o `/`.
2. Tao trang moi `/image-edit` danh rieng cho chinh sua anh.
3. Trang `/image-edit` co luong rieng:
   - Upload anh goc.
   - Nhap prompt chinh sua.
   - Goi Venice image edit API.
   - Hien preview anh goc va anh da chinh sua.
   - Tai anh da chinh sua ve may.
4. Khong tu dong dua anh da edit sang luong tao video trong lan dau. Neu can ket noi hai luong, them sau bang nut "Use for Video" hoac luu tam vao localStorage rieng.

## File can sua

### `src/lib/venice.ts`

- Them constant:

```ts
export const VENICE_IMAGE_EDIT_MODEL = "grok-imagine-quality-edit";
```

- Them type request:

```ts
export type EditImageRequest = {
  prompt: string;
  imageDataUrl: string;
  outputFormat?: "png" | "jpeg" | "webp";
};
```

- Them helper lay base64 tu data URL:

```ts
export function getBase64FromImageDataUrl(value: string) {
  const marker = ";base64,";
  const index = value.indexOf(marker);
  return index === -1 ? "" : value.slice(index + marker.length);
}
```

- Tiep tuc dung lai cac helper san co:
  - `isImageDataUrl`
  - `readResponsePayload`
  - `getErrorMessage`
  - `getVeniceDebugInfo`
  - `formatVeniceDebugSummary`

### `src/app/api/image/edit/route.ts`

- Tao API route moi cho image edit.
- Cau truc theo Next.js App Router docs:
  - File nam trong `app/api/.../route.ts`
  - Export `POST(request: Request)`
  - Dung `NextResponse`
  - `export const runtime = "nodejs"`
- Route nay doc `VENICE_API_KEY` server-side, khong dua API key ra client.
- Validate:
  - `prompt` khong rong.
  - `imageDataUrl` la base64 image data URL.
  - `outputFormat` neu co thi chi nhan `"png"`, `"jpeg"`, `"webp"`.
- Goi Venice:

```txt
POST https://api.venice.ai/api/v1/image/edit
```

- Body du kien:

```json
{
  "model": "grok-imagine-quality-edit",
  "prompt": "edit instruction",
  "image": "base64-image-content",
  "output_format": "png"
}
```

- Venice tra raw image binary. Route convert binary thanh data URL va tra JSON:

```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

- Neu Venice tra loi JSON/text, dung `readResponsePayload`, `getErrorMessage`, `getVeniceDebugInfo` de tra loi ro rang giong cac video route hien tai.

### `src/app/image-edit/page.tsx`

- Tao trang moi rieng cho chinh sua anh.
- De can browser APIs nhu `FileReader`, download bang anchor, loading state, page nen la Client Component:

```tsx
"use client";
```

- State can co:
  - `originalImageDataUrl`
  - `originalImageName`
  - `editPrompt`
  - `editedImageDataUrl`
  - `editing`
  - `error`
  - `notice`
- UI de xuat:
  - Header nho: "Venice Image Edit"
  - Link quay ve `/` de tao video.
  - Card upload anh goc.
  - Card prompt chinh sua.
  - Nut "Edit Image".
  - Hai preview song song:
    - Original Image
    - Edited Image
  - Nut "Download Edited Image" chi enable khi co `editedImageDataUrl`.
- Download anh edited lam client-side, khong can API route rieng:

```ts
function downloadEditedImage() {
  if (!editedImageDataUrl) return;
  const link = document.createElement("a");
  link.href = editedImageDataUrl;
  link.download = `edited-${originalImageName || "image"}.png`;
  link.click();
}
```

### `src/app/page.tsx`

- Chi sua nho neu can them link dieu huong sang trang chinh sua anh:
  - Them nut/link "Image Edit" o header hoac trong tab bar.
- Khong tron state image edit vao form tao video.
- Khong thay doi logic queue video, polling, history, download video.

## Luong hoat dong cua trang `/image-edit`

1. Nguoi dung mo `/image-edit`.
2. Nguoi dung upload anh goc.
3. App hien preview anh goc.
4. Nguoi dung nhap prompt chinh sua.
5. Nguoi dung bam "Edit Image".
6. Client goi `/api/image/edit`.
7. Server route goi Venice `/image/edit` voi model `grok-imagine-quality-edit`.
8. Server nhan raw image binary, convert thanh data URL va tra ve client.
9. Client hien preview anh da chinh sua.
10. Nguoi dung bam "Download Edited Image" de tai anh ve may.

## Ly do tach trang

- Giam nham lan giua anh dau vao tao video va anh dang chinh sua.
- Trang tao video tiep tuc on dinh, it rui ro regression.
- State cua image edit ngan gon, khong can them vao `VideoJob`.
- De kiem thu tung tinh nang rieng:
  - `/` cho video.
  - `/image-edit` cho anh.
- Neu sau nay muon ket noi hai luong, co the them mot buoc ro rang nhu "Use edited image for video".

## Luu y ky thuat

- Venice image edit hien la experimental, nen de model trong constant de doi nhanh khi API thay doi.
- Gioi han anh theo Venice docs:
  - Nho hon 25MB.
  - Kich thuoc trong khoang 65,536 den 33,177,600 pixels.
- Nen mac dinh `output_format` la `"png"` de giu chat luong khi download.
- Khong can them dependency moi.
- Khong can luu lich su anh edited trong lan dau. Neu can history, lam sau bang file rieng trong `data/`.

## Tai lieu da tham khao

- Venice Image Edit API: https://docs.venice.ai/api-reference/endpoint/image/edit
- Venice Image Editing Guide: https://docs.venice.ai/guides/media/image-editing
- Next.js local docs:
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
