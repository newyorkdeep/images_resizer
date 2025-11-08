import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, useImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef } from 'react';
import { Button, FlatList, StyleSheet, Text, View, Pressable, TouchableOpacity, Modal, TextInput } from "react-native";
import * as FileSystem from 'expo-file-system';  // Import FileSystem
import { Platform } from 'react-native';

export default function Index() {
  type ImgItem = { uri: string; name: string; width: number; height: number; weight: number;};
  const [stateImages, setStateImages] = useState<ImgItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modal2Visible, setModal2Visible] = useState(false);
  const [modal3Visible, setModal3Visible] = useState(false);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [nameTag, setNameTag] = useState('');
  const [compression, setCompression] = useState(1);
  // which image uri is being edited right now?
  const [editingUri, setEditingUri] = useState<string | null>(null);
  // draft of the new filename
  const [draftName, setDraftName] = useState<string>('');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  //UPLOADING IMAGES TO PROGRAM
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, 
      allowsMultipleSelection: true,
    });
    console.log(result);
    if (!result.canceled) { 
      const items: ImgItem[] = result.assets.map((asset) => {
        const uri = asset.uri;
        // Try to derive a readable name from fileName if available; else from URI path
        const derived = (asset as any).fileName
          ? (asset as any).fileName
          : uri.split('?')[0].split('#')[0].split('/').pop() || 'image.jpg';
        return { uri, name: derived, width: asset.width, height: asset.height, weight: (asset.fileSize) || 0};
      });
      setStateImages(prev => {
        const existing = new Set(prev.map(i => i.uri));
        const filtered = items.filter(i => !existing.has(i.uri));
        return [...prev, ...filtered]; // append new unique items
      });
    }
  };

  //DOWNLOADING IMAGES
  const downloadImage = (imageUri: string, filename: string) => {
    if (typeof document === 'undefined') return;
    const link = document.createElement('a'); // Create an anchor element
    link.href = imageUri; // Set the href to the image URI
    link.download = filename; // Set the name for the downloaded file
    try {
      link.type=filename.toLowerCase().endsWith('.png')? 'image/png':'image/jpeg';
    } catch {}
    document.body.appendChild(link); // Append the link to the body
    link.click(); // Programmatically click the link to trigger the download
    document.body.removeChild(link); // Remove the link after downloading
  };

  function base64SizeBytes(base64: string) {
    // Remove any whitespace/newlines
    const cleaned = base64.replace(/\s/g, '');
    // Count padding characters
    const padding = (cleaned.endsWith('==') ? 2 : (cleaned.endsWith('=') ? 1 : 0));
    return Math.ceil((cleaned.length * 3) / 4) - padding;
  }

  // ROTATING ALL IMAGES (unused feature)
  const rotateAll = async () => {
    const rotatedImages = await Promise.all(
      stateImages.map(async (item) => {
        const { manipulateAsync } = require('expo-image-manipulator');
        const result = await manipulateAsync(item.uri, [{ rotate: 90 }], { format: SaveFormat.JPEG, base64: true});
        if (!result.base64) throw new Error('No base64 returned — make sure base64: true is set.');
        const sizeBytes = base64SizeBytes(result.base64);
        return { uri: result.uri, name: item.name, width: result.width, height: result.height, weight: sizeBytes};
      })
    );
    setStateImages(rotatedImages);
  };

  const deleteOne = (cursorUri: string) => {
    setStateImages(prev =>
      prev.filter(item => item.uri !== cursorUri)
    );
  };

  const rotateOne = async (cursorUri: string) => {
    const { manipulateAsync } = require('expo-image-manipulator');
    const rotatedImages = await Promise.all(
      stateImages.map(async (item) => {
        if (item.uri === cursorUri) {
          const result = await manipulateAsync(item.uri, [{ rotate: 90 }], {
            format: SaveFormat.JPEG,
            base64: true,
          });
          if (!result.base64) throw new Error('No base64 returned — make sure base64: true is set.');
          const sizeBytes = base64SizeBytes(result.base64);
          return { uri: result.uri, name: item.name, width: result.width, height: result.height, weight: sizeBytes };
        }
        // return unchanged item for all other images
        return item;
      })
    );
    setStateImages(rotatedImages);
  };
    

  const renameAll = (a: string) => {
    // Use trimmed base or default to 'image'
    const base = a.trim() || 'image';

    setStateImages(prev =>
      prev.map((item, idx) => {
        // Preserve original extension
        const dot = item.name.lastIndexOf('.');
        const ext = dot > -1 ? item.name.slice(dot) : '';
        // Build new name with 1-based index
        const newName = `${base}-${idx + 1}${ext}`;
        return {
          ...item,
          name: newName,
        };
      })
    );
  };

  const convertAll = async (a: number) => {                           // 1 means jpg, 2 means png
    if (!stateImages.length) return;

    const { manipulateAsync } = require('expo-image-manipulator');

    const toExt = (name: string, ext: '.jpg' | '.png') => {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      return `${base}${ext}`;
    };

    const format = a === 1 ? SaveFormat.JPEG : a === 2 ? SaveFormat.PNG : undefined;
    const newExt = a === 1 ? '.jpg' : a === 2 ? '.png' : null;

    if (!format || !newExt) {
      // Unsupported option, do nothing
      return;
    }

    const convertedImages: ImgItem[] = await Promise.all(
      stateImages.map(async (item) => {
        const result = await manipulateAsync(item.uri, [], {
          format,
          // compression applies to JPEG/WEBP; PNG ignores it but it's harmless
          compress: a === 1 ? 1 : undefined,
          base64: true,
        });
        if (!result.base64) throw new Error('No base64 returned — make sure base64: true is set.');
        const sizeBytes = base64SizeBytes(result.base64);
        return {
          uri: result.uri,
          name: toExt(item.name, newExt),
          width: result.width ?? item.width,
          height: result.height ?? item.height,
          weight: sizeBytes,
        };
      })
    );
    setStateImages(convertedImages);
  };

  //RESIZING ALL IMAGES
  const resizeAll = async (h: number, w: number, compression: number) => {
    const resizedImages = await Promise.all(
      stateImages.map(async (item) => {
        // We require it inside the map async function to ensure scope
        const { manipulateAsync } = require('expo-image-manipulator');

        // Preserve PNG if the original is PNG; otherwise use JPEG
        const isPng =
          /\.png$/i.test(item.name) ||
          /\.png(\?|#)/i.test(item.uri);
        const desiredFormat = isPng ? SaveFormat.PNG : SaveFormat.JPEG;

        // Update the filename extension to match the output format
        const withExt = (name: string, ext: '.png' | '.jpg') => {
          const dot = name.lastIndexOf('.');
          const base = dot > 0 ? name.slice(0, dot) : name;
          return `${base}${ext}`;
        };
        const newName = withExt(item.name, isPng ? '.png' : '.jpg');

        let result;

        if (h > 0 && w == 0) {
          result = await manipulateAsync(
            item.uri,
            [{ resize: { height: h } }],
            { format: desiredFormat, compress: !isPng ? compression : compression }
          );
        } else if (h == 0 && w > 0) {
          result = await manipulateAsync(
            item.uri,
            [{ resize: { width: w } }],
            { format: desiredFormat, compress: !isPng ? compression : compression }
          );
        } else if (h > 0 && w > 0) {
          result = await manipulateAsync(
            item.uri,
            [{ resize: { width: w, height: h } }],
            { format: desiredFormat, compress: !isPng ? compression : compression }
          ); 
        } else if (h == 0  && w == 0) {
          // Even with 0,0 resize parameters, we still use manipulateAsync to apply the compression/format change
          result = await manipulateAsync(
            item.uri,
            [], // Empty actions array
            { format: desiredFormat, compress: !isPng ? compression : compression }
          );
        } else {
          // If logic somehow falls through, reset inputs and return original item
          setResizeHeight(0);
          setResizeWidth(0);
          return item; 
        }

        // *** FIX IS HERE ***
        // Get the actual file size of the *new* URI
        const actualSize = await getFileSizeFromUri(result.uri);
        
        return { 
          uri: result.uri, 
          name: newName, 
          width: result.width, 
          height: result.height,
          weight: actualSize // Include the new size in the state object
        };
      })
    );
    setStateImages(resizedImages);
  };

  const getFileSizeFromUri = async (uri: string): Promise<number> => {
    // Check if we are running in a web environment
    if (Platform.OS === 'web') {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            return blob.size; // Size in bytes
        } catch (error) {
            console.error("Error getting file size on web:", error);
            return 0;
        }
    } else {
        // Fallback for native (iOS/Android) using FileSystem
        try {
            const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
            return fileInfo.exists ? fileInfo.size : 0;
        } catch (e) {
            return 0;
        }
    }
};

  const downloadAll = async () => {
    for (let i=0; i<stateImages.length;i++) {
      downloadImage(stateImages[i].uri, stateImages[i].name);
    }
  };

  const commitRename = () => {
    if (!editingUri) return;
    setStateImages(imgs =>
      imgs.map(img =>
        img.uri === editingUri
          ? { ...img, name: draftName.trim() || img.name }
          : img
      )
    );
    setEditingUri(null);
    setDraftName('');
  };

  const openPreview = (uri: string) => {
    setPreviewUri(uri);
    setPreviewModalVisible(true);
    console.log(previewUri);
  };

  const closePreview = () => {
    setPreviewModalVisible(false);
    setPreviewUri(null);
  };

  const reload = async () => {
    setStateImages([]);
  };

  return (
    <View style={styles.container}>
      <FlatList style={styles.flatList}                               //this is a flatlist that holds opened images!!!
        scrollEnabled
        horizontal
        data={stateImages}
        keyExtractor={(item, i) => `${item.uri}-${i}`}
        contentContainerStyle={styles.thumbnailList}
        renderItem={({ item }) => (
          <View style={styles.thumbItem}>
            <Pressable onPress={()=>openPreview(item.uri)}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail}/>
            </Pressable>
            {editingUri === item.uri ? (
              <TextInput
              style={styles.thumbName}
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              onSubmitEditing={commitRename}
              onBlur={commitRename}
              returnKeyType="done"
              />
            ):(
              <Text style={styles.thumbName} onPress={()=> {
                setEditingUri(item.uri);
                setDraftName(item.name);
              }}>
                {item.name.length <= 100
                  ? item.name
                  : (() => {
                      const extIdx = item.name.lastIndexOf('.');
                      const ext = extIdx !== -1 ? item.name.substring(extIdx) : '';
                      const truncated = item.name.substring(0, 100 - ext.length - 3);
                      return truncated + '...' + ext;
                    })()}
              </Text>
            )}
            <Text style={styles.thumbRes}>{item.width} x {item.height}</Text>
            <Text style={styles.thumbRes}>{(item.weight/1024/1024).toFixed(2)} MB</Text>
            <Text style={styles.thumbRes} onPress={() => rotateOne(item.uri)}>Rotate</Text>
            <Text style={styles.thumbRes} onPress={() => deleteOne(item.uri)}>Delete</Text>
          </View>
        )}
      />
      <Modal visible={previewModalVisible} animationType='slide' transparent={false}>
        <View style={styles.modall}>
          {previewUri && (
            <Image source={{ uri: previewUri }} style={styles.fullview}/>
          )}
          <TouchableOpacity style={styles.button1} onPress={closePreview}><Text style={{color: 'black', alignSelf: 'center'}}>Close</Text></TouchableOpacity>
        </View>
      </Modal>
      <View style={styles.horizview}>                              
        <TouchableOpacity style={styles.button0} onPress={pickImage}><Text style={styles.textinside}>Upload</Text></TouchableOpacity>
        <Text>  </Text>
        <TouchableOpacity style={styles.button0} onPress={reload}><Text style={styles.textinside}>Reload</Text></TouchableOpacity>
        <Text>  </Text>
        <TouchableOpacity style={styles.button0} onPress={() => setModalVisible(true)}><Text style={styles.textinside}>Resize</Text></TouchableOpacity>
        <Modal animationType='slide' transparent={false} visible={modalVisible} onRequestClose={() => {setModalVisible(!modalVisible);}}>
          <View style={styles.modall}>
            <Text style={{alignSelf: 'center'}}>Configure Resize Options</Text> <p></p>
            <Text>New Width:</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setResizeWidth(Number(value));
            }}></TextInput> <p></p>
            <Text>New Height:</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setResizeHeight(Number(value));
            }}></TextInput> <p></p>
            <Text>JPEG Compression*</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setCompression(Number(value)*0.01);
            }}></TextInput> <p></p>
            <Text>Selected: {(compression * 100).toFixed(0)}%</Text> <p></p>
            <TouchableOpacity style={styles.button1} onPress={() => {resizeAll(resizeHeight, resizeWidth, compression); setModalVisible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Apply</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => setModalVisible(false)}><Text style={{color: 'black', alignSelf: 'center'}}>Close Modal</Text></TouchableOpacity>
            <Text>* 100% is the best quality, 0% is the lowest.</Text>
          </View>
        </Modal>
        <Text>  </Text>
        <TouchableOpacity style={styles.button0} onPress={() => setModal2Visible(true)}><Text style={styles.textinside}>Convert</Text></TouchableOpacity>
        <Modal animationType='slide' transparent={false} visible={modal2Visible} onRequestClose={() => {setModal2Visible(!modal2Visible);}}>
          <View style={styles.modall}>
            <Text style={{alignSelf: 'center'}}>Configure Converting Options</Text> <p></p>
            <TouchableOpacity style={styles.button1} onPress={() => {convertAll(1); setModal2Visible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Convert to JPG</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => {convertAll(2); setModal2Visible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Convert to PNG</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => setModal2Visible(false)}><Text style={{color: 'black', alignSelf: 'center'}}>Close Modal</Text></TouchableOpacity>                  
          </View>
        </Modal>
        <Text>  </Text>
        <TouchableOpacity style={styles.button0} onPress={() => setModal3Visible(true)}><Text style={styles.textinside}>Rename</Text></TouchableOpacity>
        <Modal animationType='slide' transparent={false} visible={modal3Visible} onRequestClose={() => {setModal3Visible(!modal2Visible);}}>
          <View style={styles.modall}>
            <Text style={{alignSelf: 'center'}}>Configure Renaming Options</Text> <p></p>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setNameTag(value);
            }}></TextInput> <p></p>
            <TouchableOpacity style={styles.button1} onPress={() => {renameAll(nameTag); setModal3Visible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Apply</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => setModal3Visible(false)}><Text style={{color: 'black', alignSelf: 'center'}}>Close Modal</Text></TouchableOpacity>
          </View>
        </Modal>
        <Text>  </Text>
        <TouchableOpacity style={styles.button0} onPress={downloadAll}><Text style={styles.textinside}>Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e7e7ff',
    alignItems: 'flex-start',  //decides where is the line of content is gonn be, on the top or bottom
    flexDirection: 'column',
  },
  textinside: {
    fontSize: 12,
    alignSelf: 'center',
  },
  text: {
    color: '#1c1c1c',
  },
  image: {
    width: 200,
    borderRadius: 19,
    margin: 2,
  },
  thumbnailList: {
    paddingHorizontal: 6,
  },
  thumbItem: {
    width: 210,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  thumbnail: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#dcdcdc',
  },
  thumbName: {
    marginTop: 4,
    maxWidth: 100,
    fontSize: 12,
    color: '#333',
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  thumbRes: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
  },
  button0: {
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    padding: 7,
    paddingVertical: 16,
    //borderWidth: 1,
  },
  button1: {
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    padding: 7,
    paddingVertical: 16,
    width: 600,
    //borderWidth: 1,
  },
  horizview: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 5,
    marginTop: 5,
  },
  modall: {
    flex: 1, 
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textinput: {
    paddingVertical: 19,
    width: 600,
  },
  flatList: {
    width: '100%',
    marginTop: 16, 
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    width: 40,
    textAlign: 'center',
  },
  fullview: {
    height:'85%',
    width: '85%',
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 20,
  }
})
