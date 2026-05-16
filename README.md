Download the complete source code by clicking the green **Code** button and selecting **Download ZIP**. Once downloaded, extract the ZIP file to a folder.

Next, visit nodejs.org to download and install Node.js.

After installation, go to the project folder. Click on the address bar at the top of the File Explorer, type `cmd`, and press **Enter** to open the Command Prompt in that directory.

Run the following command:
```
npm install
```

Then create a new file named `.env.local` (make sure the name is exactly `.env.local`, including the dot at the beginning). Open this file with Notepad and add the following line:
```
VENICE_API_KEY=your_venice_api_key_here
```
Save the file.

To get your API key, sign up for an account on Venice, add funds to your balance, and generate an API key. Copy the provided key string and paste it into the `.env.local` file.

Now, open the Command Prompt again in the project folder (by clicking the address bar and typing `cmd`). Run:
```
npm run dev
```

Once the development server is running, open your web browser and go to:
**http://localhost:3000**

Upload an image, then paste the prompt i saved in the `prompt.txt` file.

When the system shows the message *Video created successfully*, it means Grok has accepted the request and started generating the video. At this point, the download link will still point to an empty file. Wait about **1 minute**, then click the download link to get your video.