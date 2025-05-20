import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, useImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef } from 'react';
import { Button, FlatList, StyleSheet, Text, View, Pressable, TouchableOpacity, Modal, TextInput } from "react-native";

export default function Index() {
  const [stateImages, setStateImages] = useState<string[]>([]);
  const [index, setIndex]=useState(0);
  const newcontext = useImageManipulator(stateImages[index]);
  const [modalVisible, setModalVisible] = useState(false);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(0);

  //UPLOADING IMAGES TO PROGRAM
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, 
      allowsMultipleSelection: true,
    });
    console.log(result);
    if (!result.canceled) { 
      const selectedImageUris = result.assets.map((asset) => asset.uri);
      setStateImages(selectedImageUris);
    }
  };

  //DOWNLOADING IMAGES
  const downloadImage = (imageUri: string) => {
    const link = document.createElement('a'); // Create an anchor element
    link.href = imageUri; // Set the href to the image URI
    link.download = 'manipulatedimage.jpg'; // Set the name for the downloaded file
    document.body.appendChild(link); // Append the link to the body
    link.click(); // Programmatically click the link to trigger the download
    document.body.removeChild(link); // Remove the link after downloading
  };

  //ROTATING ALL IMAGES
  const rotateAll = async () => {
    const rotatedImages = await Promise.all(
      stateImages.map(async (item) => {
        const {manipulateAsync} = require ('expo-image-manipulator');
        const result = await manipulateAsync(item, [{rotate: 90}], { format: SaveFormat.JPEG});
        return result.uri;
      })
    );
    setStateImages(rotatedImages);
  };

  //RESIZING ALL IMAGES
  const resizeAll = async (h: number, w: number) => {
    const resizedImages = await Promise.all(
      stateImages.map(async (item) => {
        const {manipulateAsync} = require ('expo-image-manipulator');
        
        if (h>0 && w==0) {
          const result = await manipulateAsync(item, [{
            resize: {
              height: h,
            }
          }], {format: SaveFormat.JPEG});
          return result.uri;
        } else if (h==0 && w>0) {
          const result = await manipulateAsync(item, [{
            resize: {
              width: w,
            }
          }], {format: SaveFormat.JPEG});
          return result.uri;
        } else if (h > 0 && w > 0) {
          const result = await manipulateAsync(item, [{
            resize: {
              width: w,
              height: h,
            }
          }], {format: SaveFormat.JPEG});
          return result.uri;
        }
        setResizeHeight(0);
        setResizeWidth(0);
      }));
    setStateImages(resizedImages);
  };

  const downloadAll = async () => {
    for (let i=0; i<stateImages.length;i++) {
      downloadImage(stateImages[i]);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.horizview}>
        <TouchableOpacity style={styles.button1} onPress={pickImage}><Text style={{color: 'black'}}>Upload Images</Text></TouchableOpacity>
      </View>
      <FlatList scrollEnabled horizontal data={stateImages} renderItem={({item}) => <Image source={{ uri: item }} style={styles.image} />}></FlatList>
      <View style={styles.horizview}>
        <TouchableOpacity style={styles.button1} onPress={rotateAll}><Text style={{color: 'black'}}>Rotate All</Text></TouchableOpacity>
        <Text>  </Text>
        <TouchableOpacity style={styles.button1} onPress={() => setModalVisible(true)}><Text style={{color:'black'}}>Resize All</Text></TouchableOpacity>
        <Modal animationType='slide' transparent={false} visible={modalVisible} onRequestClose={() => {setModalVisible(!modalVisible);}}>
          <View style={styles.modall}>
            <Text style={{alignSelf: 'center'}}>Configure Resize Options</Text> <p></p>
            <Text>New Height:</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setResizeHeight(Number(value));
            }}></TextInput> <p></p>
            <Text>New Width:</Text>
            <TextInput style={styles.textinput} onChangeText={(value) => {
              setResizeWidth(Number(value));
            }}></TextInput> <p></p>
            <TouchableOpacity style={styles.button1} onPress={() => {resizeAll(resizeHeight, resizeWidth); setModalVisible(false); }}><Text style={{color: 'black', alignSelf: 'center'}}>Apply</Text></TouchableOpacity>
            <Text> </Text>
            <TouchableOpacity style={styles.button1} onPress={() => setModalVisible(false)}><Text style={{color: 'black', alignSelf: 'center'}}>Close Modal</Text></TouchableOpacity>
          </View>
        </Modal>
        <Text>  </Text>
        <TouchableOpacity style={styles.button1} onPress={downloadAll}><Text style={{color:'black'}}>Save All</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ededed',
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
  button1: {
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    padding: 7,
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
  }
})
