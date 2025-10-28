import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, useImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef } from 'react';
import { Button, FlatList, StyleSheet, Text, View, Pressable, TouchableOpacity, Modal, TextInput } from "react-native";
import Slider from '@react-native-community/slider';

export default function Index() {
  type ImgItem = { uri: string; name: string; width: number; height: number };
  const [stateImages, setStateImages] = useState<ImgItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modal2Visible, setModal2Visible] = useState(false);
  const [modal3Visible, setModal3Visible] = useState(false);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [nameTag, setNameTag] = useState('');
  const [jpgQuality, setJpgQuality] = useState(1);

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
        return { uri, name: derived, width: asset.width, height: asset.height };
      });
      setStateImages(items);
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

  //ROTATING ALL IMAGES
  const rotateAll = async () => {
    const rotatedImages = await Promise.all(
      stateImages.map(async (item) => {
        const {manipulateAsync} = require ('expo-image-manipulator');
        const result = await manipulateAsync(item.uri, [{rotate: 90}], { format: SaveFormat.JPEG});
        return { uri: result.uri, name: item.name, width: result.width, height: result.height };
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
        });

        return {
          uri: result.uri,
          name: toExt(item.name, newExt),
          width: result.width ?? item.width,
          height: result.height ?? item.height,
        };
      })
    );

    setStateImages(convertedImages);
  };

  //RESIZING ALL IMAGES
  const resizeAll = async (h: number, w: number) => {
    const resizedImages = await Promise.all(
      stateImages.map(async (item) => {
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

        if (h > 0 && w == 0) {
          const result = await manipulateAsync(
            item.uri,
            [{ resize: { height: h } }],
            { format: desiredFormat }
          );
          return { uri: result.uri, name: newName, width: result.width, height: result.height };
        } else if (h == 0 && w > 0) {
          const result = await manipulateAsync(
            item.uri,
            [{ resize: { width: w } }],
            { format: desiredFormat }
          );
          return { uri: result.uri, name: newName, width: result.width, height: result.height };
        } else if (h > 0 && w > 0) {
          const result = await manipulateAsync(
            item.uri,
            [{ resize: { width: w, height: h } }],
            { format: desiredFormat }
          );
          return { uri: result.uri, name: newName, width: result.width, height: result.height };
        } else {
          setResizeHeight(0);
          setResizeWidth(0);
          return item;
        }
      })
    );
    setStateImages(resizedImages);
  };

  const downloadAll = async () => {
    for (let i=0; i<stateImages.length;i++) {
      downloadImage(stateImages[i].uri, stateImages[i].name);
    }
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
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <Text style={styles.thumbName}>
              {item.name.length <= 100
                ? item.name
                : (() => {
                    const extIdx = item.name.lastIndexOf('.');
                    const ext = extIdx !== -1 ? item.name.substring(extIdx) : '';
                    const truncated = item.name.substring(0, 100 - ext.length - 3);
                    return truncated + '...' + ext;
                  })()}
            </Text>
            <Text style={styles.thumbRes}>{item.width} x {item.height}</Text>
          </View>
        )}
      />
      <View style={styles.horizview}>
        <TouchableOpacity style={styles.button1} onPress={pickImage}><Text style={{color: 'black'}}>Upload</Text></TouchableOpacity>
        <Text>  </Text>
        <TouchableOpacity style={styles.button1} onPress={rotateAll}><Text style={{color: 'black'}}>Rotate</Text></TouchableOpacity>
        <Text>  </Text>
        <TouchableOpacity style={styles.button1} onPress={() => setModalVisible(true)}><Text style={{color:'black'}}>Resize</Text></TouchableOpacity>
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
            <Text>Quality: *</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setJpgQuality(Number(value));
            }}></TextInput> <p></p>
            <TouchableOpacity style={styles.button1} onPress={() => {resizeAll(resizeHeight, resizeWidth); setModalVisible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Apply</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => setModalVisible(false)}><Text style={{color: 'black', alignSelf: 'center'}}>Close Modal</Text></TouchableOpacity>
            <Text>* 1 is the best quality, 0 is the lowest.</Text>
          </View>
        </Modal>
        <Text>  </Text>
        <TouchableOpacity style={styles.button1} onPress={() => setModal2Visible(true)}><Text style={{color:'black'}}>Convert</Text></TouchableOpacity>
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
        <TouchableOpacity style={styles.button1} onPress={() => setModal3Visible(true)}><Text style={{color:'black'}}>Rename</Text></TouchableOpacity>
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
        <TouchableOpacity style={styles.button1} onPress={downloadAll}><Text style={{color:'black'}}>Save</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e7e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#1c1c1c'
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
  button1: {
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    padding: 7,
    borderWidth: 1,
  },
  horizview: {
    flexDirection: 'row',
    marginBottom: 5,
    marginTop: 5,
  },
  modall: {
    marginTop: 90,
    height: 900,
    width: 600,
    alignSelf: 'center',
  },
  textinput: {
    paddingVertical: 19,
  },
  flatList: {
    width: '100%',
    marginTop: 16,
  }
})
