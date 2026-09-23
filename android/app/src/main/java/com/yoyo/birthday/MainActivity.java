package com.yoyo.birthday;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // register custom plugins BEFORE super.onCreate
    registerPlugin(SavePhotoPlugin.class);
    super.onCreate(savedInstanceState);
  }
}