Tài liệu tham khảo https://docs.venice.ai/overview/getting-started
Mục tiêu app:

* upload 1 ảnh tham chiếu
* nhập prompt chuyển động
* chọn thời lượng / độ phân giải / tỉ lệ
* gọi model `grok-imagine-image-to-video-private`
* lưu `queue_id` và `download_url`
* tự poll trạng thái
* khi xong thì tải video về

Theo docs của Venice, video generation chạy theo kiểu **async queue**: gọi `POST /video/queue`, lấy `queue_id`, sau đó poll `POST /video/retrieve` cho tới khi hoàn tất. Với các model **Grok Imagine Private**, response lúc queue có thêm `download_url`, và khi hoàn tất bạn tải video bằng URL đó thay vì lấy file mp4 trực tiếp từ retrieve response. `download_url` chỉ trả về **một lần** và có hiệu lực **24 giờ**, nên phải lưu lại. Ảnh đầu vào cho image-to-video có thể gửi bằng `image_url` là **URL công khai hoặc base64 data URL**.

## 1) Hiểu đúng model bạn đang dùng

Bạn nói muốn dùng:

`grok-imagine-image-to-video-private`

Model này là model **image-to-video private** trong catalog của Venice. Trang video guide cũng nói các model private của Grok Imagine gồm cả `grok-imagine-image-to-video-private`.

Với model image-to-video, prompt dùng để mô tả **chuyển động mong muốn**, không phải mô tả lại toàn bộ ảnh. Ví dụ: “slow cinematic push-in, hair moving gently in the wind, subtle blinking”. Docs ghi rõ image-to-video truyền ảnh qua `image_url`, và prompt nên mô tả motion.

## 2) Kiến trúc nên dùng

Để bạn vibe code dễ nhất bằng Codex Windows, nên làm:

* **Frontend:** Next.js
* **Backend:** Next.js API route
* **Lưu API key:** file `.env.local`
* **Ảnh upload:** frontend đọc file rồi chuyển thành **base64 data URL**
* **Backend gọi Venice API:** bằng `fetch`

Lý do chọn cách này:

* không cần server riêng
* Codex viết dễ
* API key không bị lộ ra trình duyệt
* dùng base64 nên không phải lo host ảnh lên chỗ khác

## 3) Tạo API key Venice

Venice yêu cầu API key để dùng API. Trong phần “Generating an API Key”, docs hướng dẫn vào trang API settings, bấm **Generate New API Key**, và key chỉ hiển thị **một lần** nên phải copy lưu lại ngay. Có loại **Admin** và **Inference Only**; với app tạo video, bạn chỉ cần **Inference Only** là đủ.

Làm như sau:

1. Mở trang settings API của Venice.
2. Tạo key mới.
3. Chọn tên dễ nhớ, ví dụ `video-app-local`.
4. Chọn **Inference Only**.
5. Copy key ra Notepad tạm thời.

## 4) Cài công cụ cần thiết trên máy Windows

Bạn cần:

* Node.js bản LTS
* VS Code
* Codex Windows / Codex CLI mà bạn đang dùng
* trình duyệt Chrome hoặc Edge

Sau đó mở terminal trong thư mục bạn muốn làm dự án.

## 5) Tạo project mới

Trong terminal:

```bash
npx create-next-app@latest venice-video-app
```

Khi nó hỏi, chọn:

* TypeScript: Yes
* ESLint: Yes
* Tailwind: Yes
* App Router: Yes
* src directory: Yes hoặc No đều được
* Turbopack: Yes

Xong thì vào thư mục:

```bash
cd venice-video-app
```

Tạo file `.env.local`:

```env
VENICE_API_KEY=PASTE_KEY_CUA_BAN_O_DAY
```

## 6) Prompt tốt nhất để đưa cho Codex

Đây là phần quan trọng nhất. Bạn copy nguyên khối prompt này vào Codex Windows:

Tạo cho tôi một ứng dụng Next.js 15 + TypeScript + Tailwind để tạo video từ ảnh tham chiếu bằng Venice API.

Yêu cầu:

* Giao diện 1 trang duy nhất.
* Có form gồm:

  * upload 1 ảnh
  * prompt chuyển động
  * negative prompt
  * duration
  * resolution
  * aspect ratio
* Model cố định: grok-imagine-image-to-video-private
* Không để lộ VENICE_API_KEY ở client. Chỉ gọi Venice từ server route.
* Khi user upload ảnh, convert file thành base64 data URL ở client rồi gửi lên server.
* Server route gọi POST [https://api.venice.ai/api/v1/video/queue](https://api.venice.ai/api/v1/video/queue)
* Body gồm:

  * model
  * prompt
  * negative_prompt
  * image_url
  * duration
  * resolution
  * aspect_ratio
* Lưu lại model, queue_id, download_url từ response.
* Tạo route poll gọi POST /video/retrieve với model và queue_id.
* Nếu retrieve trả JSON PROCESSING thì trả trạng thái về client.
* Nếu retrieve trả JSON COMPLETED và có download_url thì client tải file từ download_url.
* Thêm nút “Check status”.
* Thêm nút “Download video” khi hoàn tất.
* Thêm hiển thị progress text đơn giản: queued / processing / completed / failed.
* Thêm xử lý lỗi đẹp, rõ ràng.
* Thêm README.md hướng dẫn chạy local.
* Dùng code đơn giản, dễ đọc, ít file nhất có thể.
* Tạo sẵn file .env.local.example với biến VENICE_API_KEY=
* Không dùng database.
* Không dùng auth.
* Ưu tiên MVP hoạt động trước.

Hãy tự tạo toàn bộ file cần thiết và giải thích ngắn sau khi xong tôi cần chạy lệnh gì.

## 7) Nếu Codex hỏi “nên viết route nào?”

Bạn bảo nó làm đúng cấu trúc này:

* `src/app/page.tsx` → giao diện
* `src/app/api/video/queue/route.ts` → queue job
* `src/app/api/video/status/route.ts` → check status
* `src/app/api/video/download/route.ts` → optional, hoặc tải trực tiếp bằng `download_url`
* `README.md`
* `.env.local.example`

## 8) Payload đúng để queue video

Theo Venice docs, endpoint queue là:

`POST https://api.venice.ai/api/v1/video/queue`

Ví dụ body cho image-to-video sẽ có `model`, `prompt`, `image_url`, `duration`, và có thể thêm `resolution`, `aspect_ratio`, `negative_prompt`. Docs cũng ghi các field queue là model-specific và nên check model support qua `/models?type=video`.

MVP của bạn nên gửi body kiểu này:

```json
{
  "model": "grok-imagine-image-to-video-private",
  "prompt": "slow cinematic push-in, subtle blinking, hair gently moving in the wind",
  "negative_prompt": "low quality, blurry, distorted face, flicker, extra limbs",
  "image_url": "data:image/jpeg;base64,...",
  "duration": "5s",
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

Lưu ý:

* `image_url` dùng base64 data URL là hợp lệ cho image-to-video.
* với Grok private, hãy nhớ lưu cả `download_url` ngay khi queue xong.

## 9) Luồng app đúng phải là thế này

### Bước A — user upload ảnh

Frontend đọc file:

* `FileReader.readAsDataURL(file)`
* lấy ra chuỗi base64 data URL

### Bước B — frontend gọi API route nội bộ của bạn

Ví dụ:

```ts
POST /api/video/queue
```

Body:

```json
{
  "prompt": "...",
  "negativePrompt": "...",
  "imageDataUrl": "data:image/jpeg;base64,...",
  "duration": "5s",
  "resolution": "720p",
  "aspectRatio": "9:16"
}
```

### Bước C — server route gọi Venice

Server thêm API key và gọi Venice:

```ts
Authorization: Bearer ${process.env.VENICE_API_KEY}
```

### Bước D — nhận response queue

Docs cho biết response queue trả ít nhất:

* `model`
* `queue_id`

Và riêng Grok Imagine Private có thêm:

* `download_url`

### Bước E — poll trạng thái

Gọi:

`POST https://api.venice.ai/api/v1/video/retrieve`

Body:

```json
{
  "model": "grok-imagine-image-to-video-private",
  "queue_id": "..."
}
```

Docs nói:

* nếu còn xử lý, response là JSON `PROCESSING`
* nếu model private đã xong, retrieve có thể trả JSON `COMPLETED`, rồi bạn dùng `download_url` để tải video
* `download_url` không cần auth header khi GET

### Bước F — tải file mp4

Khi status là completed:

* frontend hiện nút **Download video**
* bấm nút thì mở `download_url`

## 10) Bạn có thể đưa cho Codex đoạn logic mẫu này

### Server route queue

```ts
const response = await fetch("https://api.venice.ai/api/v1/video/queue", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.VENICE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "grok-imagine-image-to-video-private",
    prompt,
    negative_prompt: negativePrompt,
    image_url: imageDataUrl,
    duration,
    resolution,
    aspect_ratio: aspectRatio
  })
});
```

### Server route status

```ts
const response = await fetch("https://api.venice.ai/api/v1/video/retrieve", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.VENICE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model,
    queue_id: queueId
  })
});
```

Rồi xử lý:

* nếu header là JSON → parse status
* nếu JSON có `COMPLETED` → dùng `download_url`
* nếu fail → trả lỗi về client

## 11) Chạy app local

Sau khi Codex tạo code xong:

```bash
npm install
npm run dev
```

Mở:

```text
http://localhost:3000
```

## 12) Cách test lần đầu

Dùng 1 ảnh chân dung rõ mặt và prompt đơn giản như:

```text
slow cinematic push-in, natural blinking, soft wind in hair, realistic motion
```

Chọn:

* duration: `5s`
* resolution: `720p`
* aspect ratio: `9:16`

Làm MVP trước. Đừng bật quá nhiều tuỳ chọn ngay.

## 13) Các lỗi bạn rất dễ gặp

### Lỗi 1: Ảnh quá nặng

Giải pháp:

* resize ảnh xuống khoảng 1024–1536 px cạnh dài trước
* dùng JPG chất lượng vừa phải

### Lỗi 2: Prompt quá dài

Docs nói prompt video tối đa 2500 ký tự, nhưng thực tế nên ngắn, rõ, tập trung motion.

### Lỗi 3: Quên lưu `download_url`

Với model private, đây là lỗi phổ biến nhất. Docs ghi rõ URL này chỉ trả về một lần ở bước queue.

### Lỗi 4: Đưa API key ra client

Không được gọi Venice trực tiếp từ `page.tsx`. Phải gọi qua API route server của Next.js.

### Lỗi 5: Poll quá dày

Docs khuyên chờ khoảng **5 giây** rồi poll lại.

## 14) Prompt motion nên viết thế nào

Với image-to-video, hãy viết theo công thức này:

* **camera movement**
* **subject motion**
* **environment motion**
* **style / realism**
* **negative prompt**

Ví dụ tốt:

```text
slow cinematic dolly-in, the girl softly smiles and blinks, hair gently sways in the breeze, realistic natural motion, stable face, high realism
```

Negative prompt:

```text
blurry, distorted face, flicker, jitter, warped hands, low quality, oversaturated
```

## 15) Khi app chạy được rồi, nâng cấp tiếp

Sau MVP, bảo Codex thêm dần:

* auto polling mỗi 5 giây
* lịch sử job trong localStorage
* preview thumbnail ảnh đã upload
* nút copy `queue_id`
* nút cleanup gọi `/video/complete`
* preset prompt cho portrait / product / anime / cinematic

Docs có endpoint `POST /video/complete` để xoá media khỏi storage sau khi tải xong.

## 16) Nếu bạn muốn dùng Codex CLI với Venice luôn

Venice có guide riêng cho **Codex CLI**. Họ hướng dẫn tạo `.codex/config.toml`, đặt `model_provider = "venice"`, `base_url = "https://api.venice.ai/api/v1/"`, và token ở `experimental_bearer_token`. 

Nhưng trong case của bạn, cái này **không bắt buộc** để làm app video. Chỉ cần Codex viết code giúp bạn là đủ. Phần app vẫn gọi Venice bằng API key trong `.env.local`.

## 17) Lộ trình ngắn gọn nhất cho bạn

Hôm nay bạn làm đúng thứ tự này:

1. tạo Venice API key
2. tạo project Next.js
3. tạo `.env.local`
4. paste prompt lớn cho Codex
5. để Codex sinh code
6. chạy `npm run dev`
7. upload ảnh và test `5s / 720p / 9:16`
8. nếu lỗi, copy nguyên error trả lại cho Codex để nó sửa

Nếu bạn muốn, ở tin nhắn tiếp theo tôi sẽ viết luôn cho bạn một **prompt Codex phiên bản mạnh hơn**, kiểu “copy-paste một phát là nó dựng trọn project hoàn chỉnh”.

[1]: https://docs.venice.ai/overview/guides/video-generation "Video Generation | Venice API Docs"
[2]: https://docs.venice.ai/models/overview?utm_source=chatgpt.com "Models | Venice API Docs"
[3]: https://docs.venice.ai/overview/guides/generating-api-key "Generating an API Key | Venice API Docs"
[4]: https://docs.venice.ai/overview/guides/codex-cli "Codex CLI with Venice | Venice API Docs"
