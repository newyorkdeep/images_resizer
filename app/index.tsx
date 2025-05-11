import { SaveFormat, useImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const [postImage, setPostImage] = useState('');
  const context = useImageManipulator(postImage);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, 
      quality: 1, 
      //allowsMultipleSelection: true,
    });
    console.log(result);
    if (!result.canceled) {
      const selectedImageUris = result.assets.map((asset) => asset.uri);
      setPostImage(result.assets[0].uri);
    }
  };

  const rotate90 = async () => {
    context.rotate(90);
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
    });
    setPostImage(result.uri);
  };
  
  return (
    <View style={styles.container}>
      <Button title="Click to rotate" onPress={rotate90}></Button>
      <Text style={styles.text} onPress={pickImage}>Click here to upload photos for editing.</Text>
      {postImage && <Image source={{ uri: postImage }} style={styles.image} />}
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
    width: 300,
    height: 200,
    borderRadius: 19,
  }
})
