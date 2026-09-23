package com.yoyo.birthday;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "SavePhoto")
public class SavePhotoPlugin extends Plugin {

  @PluginMethod
  public void save(PluginCall call) {
    String b64 = call.getString("base64");
    String name = call.getString("name", "yoyo-photo.jpg");
    String mime = call.getString("mime", "image/jpeg");
    if (b64 == null) { call.reject("base64 is required"); return; }

    try {
      ContentValues values = new ContentValues();
      values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
      values.put(MediaStore.Images.Media.MIME_TYPE, mime);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        /* lands in the Gallery under Pictures/Yoyo Birthday */
        values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Yoyo Birthday");
      }

      Uri uri = getContext().getContentResolver()
          .insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (uri == null) { call.reject("could not create the file"); return; }

      byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
      try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
        os.write(bytes);
        os.flush();
      }

      JSObject ret = new JSObject();
      ret.put("uri", uri.toString());
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("save failed: " + e.getMessage(), e);
    }
  }
}