from picture import Picture
import time

if __name__ == "__main__":
    picture = Picture()
    if (not picture.process()):
        picture.print_help()

    picture.run()
    time.sleep(10)